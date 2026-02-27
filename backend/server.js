const express = require('express');
const cors = require('cors');
require('dotenv').config();
const interviewRoutes = require('./routes/interviewRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/interview', interviewRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend live on port ${PORT}`));