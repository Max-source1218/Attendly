const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

require("dotenv").config();
require("./db");

const app = express();

const PORT = process.env.PORT || 5000

app.use(bodyParser.json());
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const verified = jwt.verify(token, 'your_secret_key'); // Same secret key
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

app.use("/api/auth", require('./routes/authRoutes'));
app.use("/api/classes", verifyToken, require("./routes/classesRoutes"));
app.use("/api/students", verifyToken, require("./routes/studentRoutes"));
app.use("/api/subjects", verifyToken, require("./routes/subjectRoutes"));
app.use("/api/attendance", verifyToken, require("./routes/attendanceRoutes"));

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
