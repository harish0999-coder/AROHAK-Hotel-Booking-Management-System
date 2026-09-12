const express = require('express');
const { v4: uuid } = require('uuid');
const store = require('../data/store');
const { authenticate, authorize } = require('../middleware/auth');
const { isValidDateString, rangesOverlap } = require('../utils/dates');

const router = express.Router();

const ACTIVE_BOOKING_STATUSES = ['CONFIRMED'];

function isRoomFreeForRange(db, roomId, checkIn, checkOut, excludeBookingId) {
  return !db.bookings.some(
    (b) =>
      b.roomId === roomId &&
      b.id !== excludeBookingId &&
      ACTIVE_BOOKING_STATUSES.includes(b.status) &&
      rangesOverlap(b.checkIn, b.checkOut, checkIn, checkOut)
  );
}

function roomWithComputedAvailability(db, room, checkIn, checkOut) {
  const base = { ...room };
  if (checkIn && checkOut) {
    base.isAvailableForDates =
      room.availabilityStatus === 'Active' && isRoomFreeForRange(db, room.id, checkIn, checkOut);
  }
  return base;
}

// GET /api/rooms
// Optional query: hotelId, checkIn, checkOut, guests
// Public endpoint so customers can browse before logging in; inactive rooms are hidden from the public view.
router.get('/', (req, res) => {
  const { db } = store;
  const { hotelId, checkIn, checkOut, guests } = req.query;

  if ((checkIn && !checkOut) || (!checkIn && checkOut)) {
    return res.status(400).json({ message: 'Please provide both a check-in and check-out date.' });
  }
  if (checkIn && checkOut) {
    if (!isValidDateString(checkIn) || !isValidDateString(checkOut)) {
      return res.status(400).json({ message: 'Dates must be in YYYY-MM-DD format.' });
    }
    if (checkIn >= checkOut) {
      return res.status(400).json({ message: 'Check-out date must be after the check-in date.' });
    }
  }

  let rooms = db.rooms;
  if (hotelId) rooms = rooms.filter((r) => r.hotelId === hotelId);

  rooms = rooms.filter((r) => r.availabilityStatus === 'Active');

  if (guests) {
    const guestCount = parseInt(guests, 10);
    if (!isNaN(guestCount)) rooms = rooms.filter((r) => r.capacity >= guestCount);
  }

  const result = rooms.map((r) => roomWithComputedAvailability(db, r, checkIn, checkOut));

  if (checkIn && checkOut) {
    result.sort((a, b) => Number(b.isAvailableForDates) - Number(a.isAvailableForDates));
  }

  res.json({ rooms: result });
});

// GET /api/rooms/all  (Admin/Receptionist - includes inactive rooms, for management screens)
router.get('/all', authenticate, authorize('admin', 'receptionist'), (req, res) => {
  const { db } = store;
  const { hotelId } = req.query;
  let rooms = db.rooms;
  if (hotelId) rooms = rooms.filter((r) => r.hotelId === hotelId);
  res.json({ rooms });
});

// GET /api/rooms/:id
router.get('/:id', (req, res) => {
  const { db } = store;
  const room = db.rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found.' });
  const { checkIn, checkOut } = req.query;
  res.json({ room: roomWithComputedAvailability(db, room, checkIn, checkOut) });
});

// POST /api/rooms  (Admin only - add a room)
router.post('/', authenticate, authorize('admin'), (req, res) => {
  const { db, save } = store;
  const { hotelId, roomNumber, roomType, capacity, pricePerNight, description, amenities } = req.body || {};

  if (!hotelId || !roomNumber || !roomType || !capacity || !pricePerNight) {
    return res.status(400).json({
      message: 'hotelId, roomNumber, roomType, capacity and pricePerNight are required.'
    });
  }
  const hotel = db.hotels.find((h) => h.id === hotelId);
  if (!hotel) return res.status(404).json({ message: 'Hotel not found.' });

  const duplicate = db.rooms.find((r) => r.hotelId === hotelId && r.roomNumber === String(roomNumber));
  if (duplicate) {
    return res.status(409).json({ message: 'A room with this room number already exists at this hotel.' });
  }

  const room = {
    id: uuid(),
    hotelId,
    roomNumber: String(roomNumber),
    roomType,
    capacity: Number(capacity),
    pricePerNight: Number(pricePerNight),
    availabilityStatus: 'Active',
    description: description || '',
    amenities: Array.isArray(amenities) ? amenities : []
  };

  db.rooms.push(room);
  save();
  res.status(201).json({ room });
});

// PUT /api/rooms/:id  (Admin only - update room details)
router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const { db, save } = store;
  const room = db.rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found.' });

  const { roomNumber, roomType, capacity, pricePerNight, description, amenities } = req.body || {};
  if (roomNumber !== undefined) room.roomNumber = String(roomNumber);
  if (roomType !== undefined) room.roomType = roomType;
  if (capacity !== undefined) room.capacity = Number(capacity);
  if (pricePerNight !== undefined) room.pricePerNight = Number(pricePerNight);
  if (description !== undefined) room.description = description;
  if (amenities !== undefined) room.amenities = Array.isArray(amenities) ? amenities : room.amenities;

  save();
  res.json({ room });
});

// PATCH /api/rooms/:id/availability  (Admin & Receptionist - toggle Active/Inactive)
router.patch('/:id/availability', authenticate, authorize('admin', 'receptionist'), (req, res) => {
  const { db, save } = store;
  const room = db.rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found.' });

  const { availabilityStatus } = req.body || {};
  if (!['Active', 'Inactive'].includes(availabilityStatus)) {
    return res.status(400).json({ message: 'availabilityStatus must be Active or Inactive.' });
  }
  room.availabilityStatus = availabilityStatus;
  save();
  res.json({ room });
});

// DELETE /api/rooms/:id (Admin only)
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const { db, save } = store;
  const idx = db.rooms.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Room not found.' });

  const hasActiveBookings = db.bookings.some(
    (b) => b.roomId === req.params.id && ACTIVE_BOOKING_STATUSES.includes(b.status)
  );
  if (hasActiveBookings) {
    return res.status(409).json({
      message: 'This room has active bookings. Deactivate it instead of deleting it.'
    });
  }

  db.rooms.splice(idx, 1);
  save();
  res.json({ message: 'Room deleted.' });
});

module.exports = router;
