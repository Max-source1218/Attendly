const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Class = require('../models/Class'); // Add if missing
const Attendance = require('../models/Attendance');

const router = express.Router();

// GET /api/students?classId=...&subjectId=...: Get students for a class (owned by user), optionally filtered by subject (exclude dropped and irregular students)
router.get('/', async (req, res) => {
  try {
    const { classId, subjectId } = req.query;
    const userId = req.user.id;

    console.log('GET /api/students called with classId:', classId, 'subjectId:', subjectId, 'userId:', userId);

    if (!classId) return res.status(400).json({ error: 'classId is required' });

    // Validate classId as ObjectId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Invalid classId' });
    }

    let students = await Student.find({ classId, userId });
    console.log('Initial students found:', students.length);

    if (subjectId) {
      // Validate subjectId as ObjectId
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ error: 'Invalid subjectId' });
      }

      const subjectObjectId = new mongoose.Types.ObjectId(subjectId);
      const subject = await Subject.findOne({ _id: subjectObjectId, userId });

      if (subject) {
        console.log('Subject found:', subject.name, 'Exclusions:', subject.excludedStudents);

        // Find the class name from classId
        const classDoc = await Class.findOne({ _id: new mongoose.Types.ObjectId(classId), userId });
        if (classDoc) {
          const className = classDoc.name;
          console.log('Class name:', className);

          // Get exclusions for this class
          const exclusion = subject.excludedStudents && subject.excludedStudents.find(ex => ex.className === className);
          console.log('Exclusions for class:', exclusion);

          if (exclusion && exclusion.studentIds) {
            const excludedIds = exclusion.studentIds.map(id => id.toString());
            console.log('Excluding students:', excludedIds);
            students = students.filter(student => !excludedIds.includes(student._id.toString()));
            console.log('Filtered students:', students.length);
          } else {
            console.log('No exclusions found for this class');
          }
        } else {
          console.log('Class not found for classId:', classId);
        }
      } else {
        console.log('Subject not found for subjectId:', subjectId);
      }

      // Also apply attendance-based filtering as before
      const attendanceRecords = await Attendance.find({
        userId,
        subjectId: subjectObjectId,
        classId,
        'records.0': { $exists: true }
      }).distinct('records.studentId');

      if (attendanceRecords.length > 0) {
        students = students.filter(student => attendanceRecords.some(id => id.equals(student._id)));
      }
    }

    res.json(students);
  } catch (err) {
    console.error('Error in GET /api/students:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students: Add a student to a class
router.post('/', async (req, res) => {
  try {
    const { name, classId } = req.body;
    const userId = req.user.id;

    console.log('Adding student:', name, 'to class:', classId, 'for user:', userId);

    if (!name || !classId) return res.status(400).json({ error: 'Name and classId are required' });

    // Validate classId as ObjectId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Invalid classId' });
    }

    const classObjectId = new mongoose.Types.ObjectId(classId);

    // Check if the class exists and belongs to the user
    const classExists = await Class.findOne({ _id: classObjectId, userId });
    if (!classExists) {
      return res.status(404).json({ error: 'Class not found or not owned by you' });
    }

    const newStudent = new Student({ name, classId: classObjectId, userId });
    await newStudent.save();

    console.log('Student added:', newStudent);
    res.status(201).json(newStudent);
  } catch (err) {
    console.error('Error adding student:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/students/:id?subjectId=...&classId=...: Delete a student (full or subject-specific)
router.delete('/:id', async (req, res) => {
  try {
    const studentId = req.params.id;
    const { subjectId, classId } = req.query;
    const userId = req.user.id;

    console.log('Attempting to delete student:', studentId, 'subjectId:', subjectId, 'classId:', classId, 'for user:', userId);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    // Check if the student belongs to the user
    const student = await Student.findOne({ _id: studentObjectId, userId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found or not owned by you' });
    }

    if (subjectId && classId) {
      // Subject-specific deletion
      if (!mongoose.Types.ObjectId.isValid(subjectId) || !mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ error: 'Invalid subjectId or classId' });
      }

      const subjectObjectId = new mongoose.Types.ObjectId(subjectId);
      const classObjectId = new mongoose.Types.ObjectId(classId);

      // Remove attendance records for this student in the specific subject-class
      const attendanceUpdate = await Attendance.updateMany(
        { userId, subjectId: subjectObjectId, classId: classObjectId },
        { $pull: { records: { studentId: studentObjectId } } }
      );
      console.log('Attendance records updated:', attendanceUpdate);

      // Remove attendance documents with no records left
      const attendanceDelete = await Attendance.deleteMany({
        userId,
        subjectId: subjectObjectId,
        classId: classObjectId,
        records: { $size: 0 }
      });
      console.log('Empty attendance docs deleted:', attendanceDelete);

      res.json({ message: 'Student dropped from this subject-class' });
    } else {
      // Full deletion
      const deletedStudent = await Student.findOneAndDelete({ _id: studentObjectId, userId });
      console.log('Student deleted:', deletedStudent);

      // Delete all attendance records for this student
      const attendanceDelete = await Attendance.deleteMany({ userId, 'records.studentId': studentObjectId });
      console.log('Attendance records deleted:', attendanceDelete);

      res.json({ message: 'Student and attendance records deleted' });
    }
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;