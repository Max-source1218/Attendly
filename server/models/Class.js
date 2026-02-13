const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Add this
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Class", classSchema);