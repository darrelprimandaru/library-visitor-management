const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Dummy admin credentials (replace with env or DB if needed)
const ADMIN_USER = 'admin';
const ADMIN_PASS_HASH = bcrypt.hashSync('admin123', 10); // hashed password

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USER || !bcrypt.compareSync(password, ADMIN_PASS_HASH)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

module.exports = router;
