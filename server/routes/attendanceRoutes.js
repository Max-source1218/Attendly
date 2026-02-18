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
// GET /api/attendance/student-records: Get aggregated student attendance per class
// GET /api/attendance/student-records: Get aggregated student attendance per class (optionally filtered by subjectId and classId)
router.get('/student-records', async (req, res) => {
  try {
    const userId = req.user.id;
    const { subjectId, classId } = req.query; // Get optional filters

    console.log('Fetching student records for userId:', userId, 'subjectId:', subjectId, 'classId:', classId);

    let matchStage = { userId: new mongoose.Types.ObjectId(userId) };
    if (subjectId) matchStage.subjectId = new mongoose.Types.ObjectId(subjectId);
    if (classId) matchStage.classId = new mongoose.Types.ObjectId(classId);

    const aggregatedStats = await Attendance.aggregate([
      { $match: matchStage }, // Apply filters here
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
              studentId: '$studentInfo._id',
              studentName: '$studentInfo.name',
              presentCount: '$presentCount',
              absentCount: '$absentCount'
            }
          }
        }
      }
    ]);

    console.log('Filtered aggregated stats:', aggregatedStats);
    res.json(aggregatedStats);
  } catch (err) {
    console.error('Error in student-records:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/subject-records: Get attendance records grouped by subject and class
router.get('/subject-records', async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching subject records for userId:', userId);

    const subjectStats = await Attendance.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $unwind: '$records' },
      {
        $group: {
          _id: { subjectId: '$subjectId', classId: '$classId', studentId: '$records.studentId' },
          presentCount: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id.subjectId',
          foreignField: '_id',
          as: 'subjectInfo'
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
      { $unwind: { path: '$subjectInfo', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$studentInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { subjectId: '$_id.subjectId', classId: '$_id.classId' },
          subjectName: { $first: '$subjectInfo.name' },
          className: { $first: '$classInfo.name' },
          totalPresents: { $sum: '$presentCount' },
          totalAbsences: { $sum: '$absentCount' },
          students: {
            $push: {
              studentId: '$studentInfo._id',
              studentName: '$studentInfo.name',
              presentCount: '$presentCount',
              absentCount: '$absentCount'
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id.subjectId',
          subjectName: { $first: '$subjectName' },
          classes: {
            $push: {
              classId: '$_id.classId',
              className: '$className',
              totalPresents: '$totalPresents',
              totalAbsences: '$totalAbsences',
              students: '$students'
            }
          }
        }
      }
    ]);

    console.log('Subject stats:', subjectStats);
    res.json(subjectStats);
  } catch (err) {
    console.error('Error in subject-records:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;