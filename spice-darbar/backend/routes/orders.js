const router    = require('express').Router();
const pool      = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { broadcast }   = require('../middleware/websocket');

function orderNum() {
  const d = new Date();
  return `SD-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}-${Math.floor(Math.random()*900+100)}`;
}

async function fullOrder(id) {
  const { rows } = await pool.query(`
    SELECT o.*,
      json_agg(json_build_object(
        'id',oi.id,'menu_item_id',oi.menu_item_id,
        'name',oi.item_name,'emoji',oi.item_emoji,
        'quantity',oi.quantity,'unit_price',oi.unit_price,
        'line_total',oi.line_total,'special_note',oi.special_note
      ) ORDER BY oi.id) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id=o.id
    WHERE o.id=$1 GROUP BY o.id`, [id]);
  return rows[0] || null;
}

// POST /api/orders — customer places order
router.post('/', async (req, res) => {
  const { table_number, items, customer_lang='en', notes } = req.body;
  if (!table_number || !items?.length) return res.status(400).json({ error:'table_number and items required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // fetch current prices from DB (never trust client-side prices)
    const ids = items.map(i=>i.menu_item_id);
    const { rows: menuRows } = await client.query(
      `SELECT id,name,emoji,price,is_available FROM menu_items WHERE id=ANY($1)`, [ids]
    );
    const menuMap = Object.fromEntries(menuRows.map(m=>[m.id,m]));

    for (const item of items) {
      const m = menuMap[item.menu_item_id];
      if (!m) throw { status:404, msg:`Item ${item.menu_item_id} not found` };
      if (!m.is_available) throw { status:409, msg:`"${m.name}" is currently unavailable` };
    }

    let subtotal = 0;
    const lines = items.map(i => {
      const m = menuMap[i.menu_item_id];
      const lt = parseFloat(m.price) * i.quantity;
      subtotal += lt;
      return { ...i, name:m.name, emoji:m.emoji, unit_price:parseFloat(m.price), line_total:lt };
    });

    const gst   = parseFloat((subtotal*0.05).toFixed(2));
    const total  = parseFloat((subtotal+gst).toFixed(2));
    const onum   = orderNum();

    const { rows:[order] } = await client.query(
      `INSERT INTO orders (order_number,table_number,status,subtotal,gst_amount,total_amount,customer_lang,notes)
       VALUES ($1,$2,'new',$3,$4,$5,$6,$7) RETURNING *`,
      [onum,table_number,subtotal,gst,total,customer_lang,notes||null]
    );

    for (const l of lines) {
      await client.query(
        `INSERT INTO order_items (order_id,menu_item_id,item_name,item_emoji,quantity,unit_price,line_total,special_note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [order.id,l.menu_item_id,l.name,l.emoji,l.quantity,l.unit_price,l.line_total,l.special_note||null]
      );
    }

    await client.query('COMMIT');

    const fo = await fullOrder(order.id);
    broadcast('new_order', fo, 'kitchen');  // real-time push to kitchen screen
    res.status(201).json({ success:true, data:fo });
  } catch(e) {
    await client.query('ROLLBACK');
    if (e.status) return res.status(e.status).json({ error:e.msg });
    console.error('POST /orders:', e.message);
    res.status(500).json({ error:'Failed to place order' });
  } finally { client.release(); }
});

// GET /api/orders — kitchen: active orders for today
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let q = `
      SELECT o.*, json_agg(json_build_object(
        'name',oi.item_name,'emoji',oi.item_emoji,
        'quantity',oi.quantity,'line_total',oi.line_total,'special_note',oi.special_note
      ) ORDER BY oi.id) AS items
      FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id
      WHERE o.placed_at::date=CURRENT_DATE`;
    const p = [];
    if (status) { q += ` AND o.status=$1`; p.push(status); }
    q += ' GROUP BY o.id ORDER BY o.placed_at DESC';
    const { rows } = await pool.query(q, p);
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// GET /api/orders/table/:num — customer checks their orders
router.get('/table/:num', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*, json_agg(json_build_object(
        'name',oi.item_name,'emoji',oi.item_emoji,'quantity',oi.quantity
      ) ORDER BY oi.id) AS items
      FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id
      WHERE o.table_number=$1 AND o.placed_at::date=CURRENT_DATE
      GROUP BY o.id ORDER BY o.placed_at DESC`,
      [req.params.num]);
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// PATCH /api/orders/:id/status — kitchen updates status
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  const valid = ['new','preparing','ready','served','cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error:'Invalid status' });
  try {
    const { rows } = await pool.query(
      `UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error:'Order not found' });
    const fo = await fullOrder(req.params.id);
    broadcast('order_status', { id:req.params.id, status, order:fo });
    res.json({ success:true, data:fo });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// GET /api/orders/stats/today — manager dashboard
router.get('/stats/today', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER(WHERE status='new')        AS new_count,
        COUNT(*) FILTER(WHERE status='preparing')  AS preparing_count,
        COUNT(*) FILTER(WHERE status='ready')      AS ready_count,
        COUNT(*) FILTER(WHERE status='served')     AS served_count,
        COALESCE(SUM(total_amount) FILTER(WHERE status='served'),0) AS revenue,
        COUNT(*) AS total_orders
      FROM orders WHERE placed_at::date=CURRENT_DATE`);
    res.json({ success:true, data:rows[0] });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

module.exports = router;
