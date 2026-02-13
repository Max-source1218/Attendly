const express = require('express');
const Class = require('../models/Class');

const router = express.Router();

// GET /api/classes: Get all classes for the authenticated user
router.get('/', async (req, res) => {
  try {
    const classes = await Class.find({ userId: req.user.id });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes: Create a new class
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Class name is required' });

    const newClass = new Class({ name, userId: req.user.id });
    await newClass.save();
    res.status(201).json(newClass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/classes/:id: Delete a class (only if owned by user)
router.delete('/:id', async (req, res) => {
  try {
    const deletedClass = await Class.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!deletedClass) return res.status(404).json({ error: 'Class not found or not owned by you' });
    res.json({ message: 'Class deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;