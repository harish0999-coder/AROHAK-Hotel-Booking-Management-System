const express = require('express');
const store = require('../data/store');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/hotels  (public - customers browse the single hotel before login too)
router.get('/', (req, res) => {
  const { db } = store;
  res.json({ hotels: db.hotels });
});

// GET /api/hotels/:id
router.get('/:id', (req, res) => {
  const { db } = store;
  const hotel = db.hotels.find((h) => h.id === req.params.id);
  if (!hotel) return res.status(404).json({ message: 'Hotel not found.' });
  res.json({ hotel });
});

// PUT /api/hotels/:id  (Admin only - manage hotel information)
router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const { db, save } = store;
  const hotel = db.hotels.find((h) => h.id === req.params.id);
  if (!hotel) return res.status(404).json({ message: 'Hotel not found.' });

  const { name, address, city, description, contactNumber, email, status } = req.body || {};
  if (name !== undefined) hotel.name = name;
  if (address !== undefined) hotel.address = address;
  if (city !== undefined) hotel.city = city;
  if (description !== undefined) hotel.description = description;
  if (contactNumber !== undefined) hotel.contactNumber = contactNumber;
  if (email !== undefined) hotel.email = email;
  if (status !== undefined) {
    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Active or Inactive.' });
    }
    hotel.status = status;
  }

  save();
  res.json({ hotel });
});

module.exports = router;
