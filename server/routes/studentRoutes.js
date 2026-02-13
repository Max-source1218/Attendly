const express = require('express');
const Student = require('../models/Student');

const router = express.Router();

// GET /api/students?classId=...: Get students for a class (owned by user)
router.get('/', async (req, res) => {
  try {
    const { classId } = req.query;
    const students = await Student.find({ classId, userId: req.user.id });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students: Add a student to a class
router.post('/', async (req, res) => {
  try {
    const { name, classId } = req.body;
    if (!name || !classId) return res.status(400).json({ error: 'Name and classId are required' });

    const newStudent = new Student({ name, classId, userId: req.user.id });
    await newStudent.save();
    res.status(201).json(newStudent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/students/:id: Delete a student (only if owned by user)
router.delete('/:id', async (req, res) => {
  try {
    const deletedStudent = await Student.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!deletedStudent) return res.status(404).json({ error: 'Student not found or not owned by you' });
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;