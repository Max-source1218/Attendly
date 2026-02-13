const express = require('express');
const Attendance = require('../models/Attendance');
const mongoose = require('mongoose'); // Ensure this is imported

const router = express.Router();

// POST /api/attendance: Save attendance for a class and subject
router.post('/', async (req, res) => {
  try {
    const { classId, subjectId, records } = req.body;
    if (!classId || !subjectId || !records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'classId, subjectId, and records array are required' });
    }

    const newAttendance = new Attendance({ classId, subjectId, records, userId: req.user.id });
    await newAttendance.save();
    res.status(201).json(newAttendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance: Fetch attendance records and aggregated student stats for the user
router.get('/', async (req, res) => {
  try {
    // Fetch attendance records
    const attendanceRecords = await Attendance.find({ userId: req.user.id }).populate('classId subjectId records.studentId');

    // Aggregate student attendance per class
    const aggregatedStats = await Attendance.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } }, // Fixed: Add 'new'
      { $unwind: '$records' },
      {
        $group: {
          _id: { classId: '$classId', studentId: '$records.studentId' },
          presentCount: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: '_id.classId',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id.studentId',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$studentInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id.classId',
          className: { $first: '$classInfo.name' },
          students: {
            $push: {
              studentName: '$studentInfo.name',
              presentCount: '$presentCount',
              absentCount: '$absentCount'
            }
          }
        }
      }
    ]);

    res.json({ records: attendanceRecords, aggregatedStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/student-records: Get aggregated student attendance per class
router.get('/student-records', async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching for userId:', userId); // Debug

    const aggregatedStats = await Attendance.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } }, // Fixed: Add 'new'
      { $unwind: '$records' },
      {
        $group: {
          _id: { classId: '$classId', studentId: '$records.studentId' },
          presentCount: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: '_id.classId',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id.studentId',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$studentInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id.classId',
          className: { $first: '$classInfo.name' },
          students: {
            $push: {
              studentName: '$studentInfo.name',
              presentCount: '$presentCount',
              absentCount: '$absentCount'
            }
          }
        }
      }
    ]);

    console.log('Aggregated stats:', aggregatedStats); // Debug
    res.json(aggregatedStats);
  } catch (err) {
    console.error('Error in student-records:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;