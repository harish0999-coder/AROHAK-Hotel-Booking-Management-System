const express = require('express');
const { v4: uuid } = require('uuid');
const store = require('../data/store');
const { authenticate, authorize } = require('../middleware/auth');
const { isValidDateString, nightsBetween, rangesOverlap, hoursUntilCheckIn } = require('../utils/dates');

const router = express.Router();
const ACTIVE_BOOKING_STATUSES = ['CONFIRMED'];
const DIRECT_CANCEL_WINDOW_HOURS = 24;

function isRoomFreeForRange(db, roomId, checkIn, checkOut, excludeBookingId) {
  return !db.bookings.some(
    (b) =>
      b.roomId === roomId &&
      b.id !== excludeBookingId &&
      ACTIVE_BOOKING_STATUSES.includes(b.status) &&
      rangesOverlap(b.checkIn, b.checkOut, checkIn, checkOut)
  );
}

function enrichBooking(db, booking) {
  const room = db.rooms.find((r) => r.id === booking.roomId);
  const hotel = db.hotels.find((h) => h.id === booking.hotelId);
  const customer = db.users.find((u) => u.id === booking.customerId);
  return {
    ...booking,
    room: room ? { id: room.id, roomNumber: room.roomNumber, roomType: room.roomType } : null,
    hotel: hotel ? { id: hotel.id, name: hotel.name, city: hotel.city } : null,
    customer: customer ? { id: customer.id, name: customer.name, email: customer.email } : null
  };
}

// POST /api/bookings  (Customer only)
router.post('/', authenticate, authorize('customer'), (req, res) => {
  const { db, save, runExclusive } = store;
  const { roomId, checkIn, checkOut, numberOfGuests } = req.body || {};

  if (!roomId || !checkIn || !checkOut || !numberOfGuests) {
    return res.status(400).json({ message: 'roomId, checkIn, checkOut and numberOfGuests are required.' });
  }
  if (!isValidDateString(checkIn) || !isValidDateString(checkOut)) {
    return res.status(400).json({ message: 'Dates must be in YYYY-MM-DD format.' });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (checkIn < today) {
    return res.status(400).json({ message: 'Check-in date cannot be in the past.' });
  }
  if (checkIn >= checkOut) {
    return res.status(400).json({ message: 'Check-out date must be after the check-in date.' });
  }

  const guests = Number(numberOfGuests);
  if (!Number.isInteger(guests) || guests < 1) {
    return res.status(400).json({ message: 'numberOfGuests must be a positive whole number.' });
  }

  return runExclusive(() => {
    const room = db.rooms.find((r) => r.id === roomId);
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    if (room.availabilityStatus !== 'Active') {
      return res.status(409).json({ message: 'This room is not currently available for booking.' });
    }
    if (guests > room.capacity) {
      return res.status(400).json({
        message: `This room accommodates up to ${room.capacity} guest(s). Please choose a room with more capacity.`
      });
    }
    if (!isRoomFreeForRange(db, roomId, checkIn, checkOut)) {
      return res.status(409).json({ message: 'This room is already booked for the selected dates. Please choose different dates or another room.' });
    }

    const nights = nightsBetween(checkIn, checkOut);
    const totalAmount = nights * room.pricePerNight;

    const booking = {
      id: uuid(),
      customerId: req.user.id,
      organizationId: null, // reserved for the future multi-organization extension
      hotelId: room.hotelId,
      roomId: room.id,
      checkIn,
      checkOut,
      numberOfGuests: guests,
      bookingDate: new Date().toISOString(),
      totalAmount,
      status: 'CONFIRMED'
    };

    db.bookings.push(booking);
    save();

    return res.status(201).json({ booking: enrichBooking(db, booking) });
  });
});

// GET /api/bookings/mine  (Customer only)
router.get('/mine', authenticate, authorize('customer'), (req, res) => {
  const { db } = store;
  const mine = db.bookings
    .filter((b) => b.customerId === req.user.id)
    .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate))
    .map((b) => enrichBooking(db, b));
  res.json({ bookings: mine });
});

// GET /api/bookings  (Admin & Receptionist - all bookings, optional filters)
router.get('/', authenticate, authorize('admin', 'receptionist'), (req, res) => {
  const { db } = store;
  const { status, hotelId } = req.query;
  let bookings = db.bookings;
  if (status) bookings = bookings.filter((b) => b.status === status);
  if (hotelId) bookings = bookings.filter((b) => b.hotelId === hotelId);
  bookings = bookings.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate)).map((b) => enrichBooking(db, b));
  res.json({ bookings });
});

// GET /api/bookings/:id
router.get('/:id', authenticate, (req, res) => {
  const { db } = store;
  const booking = db.bookings.find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });

  const isOwner = booking.customerId === req.user.id;
  const isStaff = ['admin', 'receptionist'].includes(req.user.role);
  if (!isOwner && !isStaff) {
    return res.status(403).json({ message: 'You do not have permission to view this booking.' });
  }
  res.json({ booking: enrichBooking(db, booking) });
});

// POST /api/bookings/:id/cancel  (Customer - direct cancel or raise a cancellation request)
router.post('/:id/cancel', authenticate, authorize('customer'), (req, res) => {
  const { db, save, runExclusive } = store;

  return runExclusive(() => {
    const booking = db.bookings.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.customerId !== req.user.id) {
      return res.status(403).json({ message: 'You can only cancel your own bookings.' });
    }
    if (booking.status === 'CANCELLED') {
      return res.status(409).json({ message: 'This booking is already cancelled.' });
    }
    if (booking.status === 'COMPLETED') {
      return res.status(409).json({ message: 'A completed stay cannot be cancelled.' });
    }

    const pendingRequest = db.cancellationRequests.find(
      (r) => r.bookingId === booking.id && r.status === 'PENDING'
    );
    if (pendingRequest) {
      return res.status(409).json({ message: 'A cancellation request for this booking is already pending review.' });
    }

    const hoursLeft = hoursUntilCheckIn(booking.checkIn);

    if (hoursLeft >= DIRECT_CANCEL_WINDOW_HOURS) {
      booking.status = 'CANCELLED';
      booking.cancelledAt = new Date().toISOString();
      save();
      return res.json({
        message: 'Booking cancelled successfully.',
        booking: enrichBooking(db, booking)
      });
    }

    const request = {
      id: uuid(),
      bookingId: booking.id,
      customerId: req.user.id,
      reason: (req.body && req.body.reason) || '',
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null
    };
    db.cancellationRequests.push(request);
    save();

    return res.status(202).json({
      message:
        'The direct-cancellation window (24 hours before check-in) has passed. Your cancellation request has been submitted for staff review.',
      cancellationRequest: request,
      booking: enrichBooking(db, booking)
    });
  });
});

// GET /api/bookings/cancellation-requests/all  (Admin & Receptionist)
router.get('/cancellation-requests/all', authenticate, authorize('admin', 'receptionist'), (req, res) => {
  const { db } = store;
  const { status } = req.query;
  let requests = db.cancellationRequests;
  if (status) requests = requests.filter((r) => r.status === status);
  const enriched = requests
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
    .map((r) => ({
      ...r,
      booking: (() => {
        const booking = db.bookings.find((b) => b.id === r.bookingId);
        return booking ? enrichBooking(db, booking) : null;
      })()
    }));
  res.json({ cancellationRequests: enriched });
});

// PATCH /api/bookings/cancellation-requests/:id  (Admin & Receptionist - approve/reject)
router.patch('/cancellation-requests/:id', authenticate, authorize('admin', 'receptionist'), (req, res) => {
  const { db, save, runExclusive } = store;
  const { decision } = req.body || {};
  if (!['APPROVE', 'REJECT'].includes(decision)) {
    return res.status(400).json({ message: 'decision must be APPROVE or REJECT.' });
  }

  return runExclusive(() => {
    const request = db.cancellationRequests.find((r) => r.id === req.params.id);
    if (!request) return res.status(404).json({ message: 'Cancellation request not found.' });
    if (request.status !== 'PENDING') {
      return res.status(409).json({ message: 'This request has already been resolved.' });
    }

    const booking = db.bookings.find((b) => b.id === request.bookingId);
    if (!booking) return res.status(404).json({ message: 'Associated booking not found.' });

    request.status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    request.resolvedAt = new Date().toISOString();
    request.resolvedBy = req.user.id;

    if (decision === 'APPROVE') {
      booking.status = 'CANCELLED';
      booking.cancelledAt = new Date().toISOString();
    }

    save();
    return res.json({ cancellationRequest: request, booking: enrichBooking(db, booking) });
  });
});

// PATCH /api/bookings/:id/status  (Admin & Receptionist - e.g. mark COMPLETED)
router.patch('/:id/status', authenticate, authorize('admin', 'receptionist'), (req, res) => {
  const { db, save } = store;
  const { status } = req.body || {};
  if (!['CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) {
    return res.status(400).json({ message: 'status must be CONFIRMED, CANCELLED or COMPLETED.' });
  }
  const booking = db.bookings.find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });

  booking.status = status;
  save();
  res.json({ booking: enrichBooking(db, booking) });
});

module.exports = router;
