const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  userId: { type: String, required: true, unique: true }, // Unique identifier for login
  password: { type: String, required: true }, // Hashed password
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);