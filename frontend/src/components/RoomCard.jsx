import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from './Ui';

const ROOM_ART = {
  'Deluxe King': ['#1F4B4A', '#2E6664'],
  'Deluxe Twin': ['#2E6664', '#1F4B4A'],
  'Premier Sea View': ['#163534', '#1F4B4A'],
  'Executive Suite': ['#96703A', '#B98A4A'],
  'Family Suite': ['#B98A4A', '#D3AC77']
};

function RoomGlyph({ roomType }) {
  const [c1, c2] = ROOM_ART[roomType] || ['#1F4B4A', '#2E6664'];
  return (
    <svg viewBox="0 0 320 160" className="h-36 w-full rounded-t-xl">
      <defs>
        <linearGradient id={`grad-${roomType.replace(/\s/g, '')}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="320" height="160" fill={`url(#grad-${roomType.replace(/\s/g, '')})`} />
      <circle cx="270" cy="35" r="22" fill="#F6F1E9" opacity="0.15" />
      <rect x="24" y="96" width="130" height="40" rx="4" fill="#F6F1E9" opacity="0.18" />
      <rect x="24" y="96" width="130" height="10" rx="4" fill="#F6F1E9" opacity="0.28" />
      <rect x="170" y="70" width="60" height="66" rx="4" fill="#F6F1E9" opacity="0.14" />
    </svg>
  );
}

export default function RoomCard({ room, checkIn, checkOut, guests }) {
  const params = new URLSearchParams();
  if (checkIn) params.set('checkIn', checkIn);
  if (checkOut) params.set('checkOut', checkOut);
  if (guests) params.set('guests', guests);
  const query = params.toString();

  const unavailable = room.isAvailableForDates === false;

  return (
    <div className="card flex flex-col overflow-hidden">
      <RoomGlyph roomType={room.roomType} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">{room.roomType}</h3>
            <p className="text-xs text-slate">Room {room.roomNumber} &middot; Sleeps {room.capacity}</p>
          </div>
          {unavailable && (
            <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
              Booked
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-sm text-slate">{room.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {(room.amenities || []).slice(0, 3).map((a) => (
            <span key={a} className="rounded-full bg-sand px-2.5 py-1 text-xs text-ink/70">
              {a}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div>
            <p className="font-display text-xl font-semibold text-ink">{formatCurrency(room.pricePerNight)}</p>
            <p className="text-xs text-slate">per night</p>
          </div>
          <Link
            to={`/rooms/${room.id}${query ? `?${query}` : ''}`}
            className="btn-primary"
          >
            View room
          </Link>
        </div>
      </div>
    </div>
  );
}
