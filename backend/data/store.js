const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

const DB_FILE = path.join(__dirname, 'db.json');

function seedData() {
  const hotelId = 'HGMUM001';
  const now = new Date().toISOString();

  const adminPass = bcrypt.hashSync('Admin@123', 10);
  const receptionistPass = bcrypt.hashSync('Reception@123', 10);
  const customerPass = bcrypt.hashSync('Customer@123', 10);

  return {
    users: [
      {
        id: uuid(),
        name: 'Ava Sharma',
        email: 'admin@arohak.com',
        password: adminPass,
        role: 'admin',
        createdAt: now
      },
      {
        id: uuid(),
        name: 'Rohan Mehta',
        email: 'receptionist@arohak.com',
        password: receptionistPass,
        role: 'receptionist',
        createdAt: now
      },
      {
        id: uuid(),
        name: 'Priya Nair',
        email: 'customer@arohak.com',
        password: customerPass,
        role: 'customer',
        createdAt: now
      }
    ],
    hotels: [
      {
        id: hotelId,
        name: 'The Meridian Grand Mumbai',
        address: '18 Marine View Road, Nariman Point',
        city: 'Mumbai',
        description:
          'A landmark waterfront hotel in Nariman Point offering sea-view rooms, an all-day restaurant, rooftop lounge and a full-service spa.',
        contactNumber: '+91 22 4567 8900',
        email: 'reservations@meridiangrand.example',
        status: 'Active',
        createdAt: now
      }
    ],
    rooms: [
      {
        id: uuid(),
        hotelId,
        roomNumber: '201',
        roomType: 'Deluxe King',
        capacity: 2,
        pricePerNight: 8500,
        availabilityStatus: 'Active',
        description: 'A bright king room with a work desk and city views, ideal for solo travellers or couples.',
        amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Tea/coffee maker', 'In-room safe']
      },
      {
        id: uuid(),
        hotelId,
        roomNumber: '202',
        roomType: 'Deluxe Twin',
        capacity: 2,
        pricePerNight: 8500,
        availabilityStatus: 'Active',
        description: 'Two comfortable twin beds with a city view, perfect for friends or colleagues travelling together.',
        amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Tea/coffee maker', 'In-room safe']
      },
      {
        id: uuid(),
        hotelId,
        roomNumber: '505',
        roomType: 'Premier Sea View',
        capacity: 3,
        pricePerNight: 12500,
        availabilityStatus: 'Active',
        description: 'A spacious room with sweeping sea views, a king bed and a sofa chair for relaxing.',
        amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Sofa chair', 'Mini refrigerator']
      },
      {
        id: uuid(),
        hotelId,
        roomNumber: '812',
        roomType: 'Executive Suite',
        capacity: 3,
        pricePerNight: 18000,
        availabilityStatus: 'Active',
        description: 'A separate bedroom and living area with sea views, bathrobe & slippers, and evening turndown service.',
        amenities: ['Wi-Fi', 'Living area', 'Bathrobe & slippers', 'Premium toiletries', 'Turndown service']
      },
      {
        id: uuid(),
        hotelId,
        roomNumber: '915',
        roomType: 'Family Suite',
        capacity: 4,
        pricePerNight: 22000,
        availabilityStatus: 'Active',
        description: 'Two bedrooms, a living area and a dining table — built for families travelling together.',
        amenities: ['Wi-Fi', 'Two bedrooms', 'Dining table', 'Living area', 'Mini refrigerator']
      },
      {
        id: uuid(),
        hotelId,
        roomNumber: '210',
        roomType: 'Deluxe King',
        capacity: 2,
        pricePerNight: 8500,
        availabilityStatus: 'Inactive',
        description: 'Currently undergoing refurbishment and not available for booking.',
        amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV']
      }
    ],
    bookings: [],
    cancellationRequests: []
  };
}

function load() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = seedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    const initial = seedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
}

let db = load();

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Simple in-process write lock to keep concurrent booking writes safe,
// since Node runs this single-threaded but we still serialize file writes
// around a critical section for overlap checks.
let writeQueue = Promise.resolve();
function runExclusive(fn) {
  const result = writeQueue.then(() => fn());
  writeQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

module.exports = {
  get db() {
    return db;
  },
  save,
  runExclusive,
  reload() {
    db = load();
    return db;
  },
  resetToSeed() {
    db = seedData();
    save();
    return db;
  }
};
