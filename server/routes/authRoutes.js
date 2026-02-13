const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// POST /api/auth/register: Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, userId, password } = req.body;
    if (!username || !userId || !password) {
      return res.status(400).json({ error: 'Username, userId, and password are required' });
    }

    // Check if userId already exists
    const existingUser = await User.findOne({ userId });
    if (existingUser) {
      return res.status(400).json({ error: 'User ID already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({ username, userId, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login: Sign in user
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ error: 'User ID and password are required' });
    }

    // Find user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(400).json({ error: 'Invalid user ID or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid user ID or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.userId, id: user._id }, 'your_secret_key', { expiresIn: '1h' }); // Change 'your_secret_key' to a secure key

    res.json({ message: 'Login successful', token, user: { username: user.username, userId: user.userId } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;