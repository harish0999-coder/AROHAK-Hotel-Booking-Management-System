const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const store = require('../data/store');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const VALID_ROLES = ['admin', 'receptionist', 'customer'];
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function publicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

function issueToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Name, email, password and role are all required.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: `Role must be one of: ${VALID_ROLES.join(', ')}.` });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const { db, save } = store;

  const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const user = {
    id: uuid(),
    name: name.trim(),
    email: normalizedEmail,
    password: bcrypt.hashSync(password, 10),
    role,
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  save();

  const token = issueToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const { db } = store;
  const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = issueToken(user);
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const { db } = store;
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
