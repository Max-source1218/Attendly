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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static("public"));

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user; // This will have user.id (MongoDB _id)
    next();
  });
};

app.use("/api/auth", require('./routes/authRoutes'));
app.use("/api/classes", authenticateToken, require("./routes/classesRoutes"));
app.use("/api/students", authenticateToken, require("./routes/studentRoutes"));
app.use("/api/subjects", authenticateToken, require("./routes/subjectRoutes"));
app.use("/api/attendance", authenticateToken, require("./routes/attendanceRoutes"));

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
