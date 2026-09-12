require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const hotelRoutes = require('./routes/hotels');
const roomRoutes = require('./routes/rooms');
const bookingRoutes = require('./routes/bookings');
const chatbotRoutes = require('./routes/chatbot'); // AI booking assistant (Gemini function-calling)
const ragRoutes = require('./routes/rag');         // RAG chatbot grounded on the hotel info PDF

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AROHAK Hotel Booking API', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/rag', ragRoutes);

// 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found.' });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`AROHAK Hotel Booking API listening on http://localhost:${PORT}`);
});
