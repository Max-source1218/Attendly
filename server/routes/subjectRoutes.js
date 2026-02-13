const express = require('express');
const Subject = require('../models/Subject');

const router = express.Router();

// GET /api/subjects: Get all subjects for the authenticated user
router.get('/', async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.user.id });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subjects: Create a new subject
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Subject name is required' });

    const newSubject = new Subject({ name, userId: req.user.id });
    await newSubject.save();
    res.status(201).json(newSubject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subjects/:id: Update subject assignments
router.put('/:id', async (req, res) => {
  try {
    const { assignedClasses } = req.body;
    const updatedSubject = await Subject.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { assignedClasses },
      { new: true }
    );
    if (!updatedSubject) return res.status(404).json({ error: 'Subject not found or not owned by you' });
    res.json(updatedSubject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/subjects/:id: Delete a subject (only if owned by user)
router.delete('/:id', async (req, res) => {
  try {
    const deletedSubject = await Subject.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!deletedSubject) return res.status(404).json({ error: 'Subject not found or not owned by you' });
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;