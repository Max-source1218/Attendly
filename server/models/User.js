const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  userId: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  password: { type: String, required: true },
  photo: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);