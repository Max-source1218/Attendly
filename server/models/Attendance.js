const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  date: { type: Date, default: Date.now },
  records: [
    {
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
      status: { type: String, enum: ['present', 'absent'], required: true }
    }
  ],
  presentCount: { type: Number, default: 0 },
  absentCount: { type: Number, default: 0 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Add this
});

// Pre-save hook to calculate counts
attendanceSchema.pre('save', function(next) {
  try {
    this.presentCount = this.records.filter(record => record.status === 'present').length;
    this.absentCount = this.records.filter(record => record.status === 'absent').length;
    if (typeof next === 'function') {
      next();
    }
  } catch (error) {
    console.error('Error in pre-save hook:', error);
    if (typeof next === 'function') {
      next(error);
    }
  }
});

module.exports = mongoose.model("Attendance", attendanceSchema);