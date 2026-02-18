const express = require('express');
const mongoose = require('mongoose'); // Add this import
const Class = require('../models/Class');
const Student = require('../models/Student'); // Add this import
const Attendance = require('../models/Attendance');

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

// DELETE /api/classes/:id: Delete a class (only if owned by user) and its students and attendance records
router.delete('/:id', async (req, res) => {
  try {
    const classId = req.params.id;
    const userId = req.user.id;

    console.log('Attempting to delete class:', classId, 'for user:', userId); // Debug

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Invalid class ID' });
    }

    const objectId = new mongoose.Types.ObjectId(classId);

    // Find and delete the class
    const deletedClass = await Class.findOneAndDelete({ _id: objectId, userId });
    if (!deletedClass) {
      console.log('Class not found or not owned by user'); // Debug
      return res.status(404).json({ error: 'Class not found or not owned by you' });
    }

    console.log('Class deleted:', deletedClass); // Debug

    // Find and delete all students in this class
    const deletedStudents = await Student.deleteMany({ classId: objectId, userId });
    console.log('Students deleted:', deletedStudents.deletedCount); // Debug

    // Delete all attendance records for students in this class
    const attendanceDelete = await Attendance.deleteMany({ classId: objectId, userId });
    console.log('Attendance records deleted:', attendanceDelete.deletedCount); // Debug

    res.json({ message: 'Class, students, and attendance records deleted' });
  } catch (err) {
    console.error('Error deleting class:', err); // Debug
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;