const router  = require('express').Router();
const pool    = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { broadcast }   = require('../middleware/websocket');

router.post('/call', async (req, res) => {
  const { table_number } = req.body;
  if (!table_number) return res.status(400).json({ error:'table_number required' });
  try {
    const { rows:[c] } = await pool.query(
      `INSERT INTO waiter_calls (table_number) VALUES ($1) RETURNING *`, [table_number]
    );
    broadcast('waiter_call', { id:c.id, table_number:c.table_number, called_at:c.called_at }, 'kitchen');
    res.status(201).json({ success:true, data:c });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.get('/calls', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM waiter_calls WHERE is_resolved=false ORDER BY called_at DESC`
    );
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.patch('/calls/:id/resolve', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE waiter_calls SET is_resolved=true,resolved_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error:'Not found' });
    broadcast('waiter_call_resolved', { id:rows[0].id });
    res.json({ success:true, data:rows[0] });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

module.exports = router;
