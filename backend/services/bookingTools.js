// This is the *only* interface the AI booking assistant is allowed to use to
// touch real data. Gemini never gets direct access to the store — it can only
// invoke these named, validated functions, matching the hackathon requirement:
// "Use a controlled tool/API layer between the AI and backend rather than
// unrestricted database access."
//
// Reuses the exact same rules as routes/rooms.js and routes/bookings.js so the
// chatbot and the regular REST API can never disagree about availability.

const { v4: uuid } = require('uuid');
const store = require('../data/store');
const { isValidDateString, nightsBetween, rangesOverlap, hoursUntilCheckIn } = require('../utils/dates');

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
  return {
    ...booking,
    room: room ? { id: room.id, roomNumber: room.roomNumber, roomType: room.roomType } : null,
    hotel: hotel ? { id: hotel.id, name: hotel.name, city: hotel.city } : null
  };
}

// --- Gemini tool schema (function declarations) -----------------------------
const bookingToolDeclarations = [
  {
    functionDeclarations: [
      {
        name: 'search_rooms',
        description:
          'Search for rooms matching a city/location, guest count, and optional room type. Returns room details and prices, NOT live availability.',
        parameters: {
          type: 'object',
          properties: {
            city: { type: 'string', description: 'City the guest wants to stay in, e.g. Mumbai' },
            numberOfGuests: { type: 'number', description: 'Number of guests the room must accommodate' },
            roomType: { type: 'string', description: 'Optional specific room type requested' }
          }
        }
      },
      {
        name: 'check_availability',
        description:
          'Check which rooms are available for the given check-in/check-out dates. Always call this before confirming a booking.',
        parameters: {
          type: 'object',
          properties: {
            city: { type: 'string' },
            checkIn: { type: 'string', description: 'YYYY-MM-DD' },
            checkOut: { type: 'string', description: 'YYYY-MM-DD' },
            numberOfGuests: { type: 'number' },
            roomType: { type: 'string' }
          },
          required: ['checkIn', 'checkOut']
        }
      },
      {
        name: 'get_booking',
        description: "Retrieve details of a booking by its ID, or list the current user's bookings if no ID is given.",
        parameters: {
          type: 'object',
          properties: {
            bookingId: { type: 'string' }
          }
        }
      },
      {
        name: 'create_booking',
        description:
          'Create a confirmed booking for the currently authenticated customer after availability has been checked and the guest has confirmed they want to proceed.',
        parameters: {
          type: 'object',
          properties: {
            roomId: { type: 'string' },
            checkIn: { type: 'string', description: 'YYYY-MM-DD' },
            checkOut: { type: 'string', description: 'YYYY-MM-DD' },
            numberOfGuests: { type: 'number' }
          },
          required: ['roomId', 'checkIn', 'checkOut', 'numberOfGuests']
        }
      },
      {
        name: 'cancel_booking',
        description:
          "Cancel an existing booking for the currently authenticated customer, applying the hotel's 24-hour cancellation policy.",
        parameters: {
          type: 'object',
          properties: {
            bookingId: { type: 'string' }
          },
          required: ['bookingId']
        }
      }
    ]
  }
];

// --- Implementations ---------------------------------------------------------

async function search_rooms({ city, numberOfGuests, roomType }) {
  const { db } = store;
  let hotels = db.hotels.filter((h) => h.status === 'Active');
  if (city) hotels = hotels.filter((h) => h.city.toLowerCase() === String(city).toLowerCase());
  if (hotels.length === 0) return { rooms: [], message: 'No active hotels found for that city.' };

  const hotelIds = new Set(hotels.map((h) => h.id));
  let rooms = db.rooms.filter((r) => hotelIds.has(r.hotelId) && r.availabilityStatus === 'Active');
  if (numberOfGuests) rooms = rooms.filter((r) => r.capacity >= Number(numberOfGuests));
  if (roomType) rooms = rooms.filter((r) => r.roomType.toLowerCase().includes(String(roomType).toLowerCase()));

  return {
    rooms: rooms.map((r) => {
      const hotel = db.hotels.find((h) => h.id === r.hotelId);
      return {
        roomId: r.id,
        hotelName: hotel?.name,
        city: hotel?.city,
        roomNumber: r.roomNumber,
        roomType: r.roomType,
        capacity: r.capacity,
        pricePerNight: r.pricePerNight,
        amenities: r.amenities
      };
    })
  };
}

async function check_availability({ city, checkIn, checkOut, numberOfGuests, roomType }) {
  if (!isValidDateString(checkIn) || !isValidDateString(checkOut)) {
    return { error: 'Dates must be in YYYY-MM-DD format.' };
  }
  if (checkIn >= checkOut) return { error: 'Check-out date must be after the check-in date.' };

  const { db } = store;
  const { rooms } = await search_rooms({ city, numberOfGuests, roomType });
  const available = rooms.filter((r) => isRoomFreeForRange(db, r.roomId, checkIn, checkOut));
  return { checkIn, checkOut, availableRooms: available };
}

async function get_booking({ bookingId }, currentUser) {
  const { db } = store;
  if (bookingId) {
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) return { error: 'Booking not found.' };
    if (currentUser.role === 'customer' && booking.customerId !== currentUser.id) {
      return { error: 'You are not authorized to view this booking.' };
    }
    return { booking: enrichBooking(db, booking) };
  }
  const bookings = db.bookings
    .filter((b) => b.customerId === currentUser.id)
    .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate))
    .map((b) => enrichBooking(db, b));
  return { bookings };
}

async function create_booking({ roomId, checkIn, checkOut, numberOfGuests }, currentUser) {
  if (!isValidDateString(checkIn) || !isValidDateString(checkOut)) {
    return { error: 'Dates must be in YYYY-MM-DD format.' };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (checkIn < today) return { error: 'Check-in date cannot be in the past.' };
  if (checkIn >= checkOut) return { error: 'Check-out date must be after the check-in date.' };

  const guests = Number(numberOfGuests);
  if (!Number.isInteger(guests) || guests < 1) return { error: 'numberOfGuests must be a positive whole number.' };

  const { db, save, runExclusive } = store;

  return runExclusive(() => {
    const room = db.rooms.find((r) => r.id === roomId);
    if (!room) return { error: 'Room not found.' };
    if (room.availabilityStatus !== 'Active') return { error: 'This room is not currently available for booking.' };
    if (guests > room.capacity) {
      return { error: `This room's maximum capacity is ${room.capacity} guest(s).` };
    }
    if (!isRoomFreeForRange(db, roomId, checkIn, checkOut)) {
      return { error: 'This room is already booked for the selected dates.' };
    }

    const nights = nightsBetween(checkIn, checkOut);
    const totalAmount = nights * room.pricePerNight;

    const booking = {
      id: uuid(),
      customerId: currentUser.id,
      organizationId: null,
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

    return { booking: enrichBooking(db, booking) };
  });
}

async function cancel_booking({ bookingId }, currentUser) {
  const { db, save, runExclusive } = store;

  return runExclusive(() => {
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) return { error: 'Booking not found.' };
    if (currentUser.role === 'customer' && booking.customerId !== currentUser.id) {
      return { error: 'You are not authorized to cancel this booking.' };
    }
    if (booking.status === 'CANCELLED') return { error: 'This booking is already cancelled.' };
    if (booking.status === 'COMPLETED') return { error: 'A completed stay cannot be cancelled.' };

    const pendingRequest = db.cancellationRequests.find(
      (r) => r.bookingId === booking.id && r.status === 'PENDING'
    );
    if (pendingRequest) return { error: 'A cancellation request for this booking is already pending review.' };

    const hoursLeft = hoursUntilCheckIn(booking.checkIn);

    if (hoursLeft >= DIRECT_CANCEL_WINDOW_HOURS) {
      booking.status = 'CANCELLED';
      booking.cancelledAt = new Date().toISOString();
      save();
      return { result: 'cancelled', message: 'Booking cancelled directly (more than 24 hours before check-in).' };
    }

    const request = {
      id: uuid(),
      bookingId: booking.id,
      customerId: currentUser.id,
      reason: '',
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null
    };
    db.cancellationRequests.push(request);
    save();

    return {
      result: 'pending_review',
      message: 'Check-in is less than 24 hours away, so this cancellation now requires staff review.'
    };
  });
}

module.exports = {
  bookingToolDeclarations,
  search_rooms,
  check_availability,
  get_booking,
  create_booking,
  cancel_booking
};
