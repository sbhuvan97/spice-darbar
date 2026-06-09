const router = require('express').Router();
const pool   = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

// GET /api/menu — all available items
router.get('/', async (req, res) => {
  try {
    const { category, veg } = req.query;
    let q = `SELECT id,name,local_name,emoji,description,price,category,region,tags,badge,is_veg
             FROM menu_items WHERE is_available=true`;
    const p = [];
    if (category) { q += ` AND category=$${p.length+1}`; p.push(category); }
    if (veg==='true') q += ` AND is_veg=true`;
    q += ' ORDER BY sort_order,id';
    const { rows } = await pool.query(q, p);
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// PATCH /api/menu/:id/availability — kitchen toggle
router.patch('/:id/availability', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE menu_items SET is_available=$1 WHERE id=$2 RETURNING *`,
      [req.body.is_available, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error:'Not found' });
    res.json({ success:true, data:rows[0] });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

module.exports = router;
