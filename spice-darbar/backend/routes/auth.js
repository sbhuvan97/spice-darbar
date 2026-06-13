const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error:'username and password required' });
  try {
    const { rows } = await pool.query(
      `SELECT * FROM staff WHERE username=$1 AND is_active=true`, [username]
    );
    if (!rows.length) return res.status(401).json({ error:'Invalid credentials' });
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error:'Invalid credentials' });
    const token = jwt.sign(
      { id:rows[0].id, username:rows[0].username, role:rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn:'8h' }
    );
    res.json({ success:true, data:{ token, username:rows[0].username, role:rows[0].role } });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ success:true, data:req.staff });
});

module.exports = router;
