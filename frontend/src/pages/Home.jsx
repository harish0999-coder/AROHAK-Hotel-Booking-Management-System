import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import RoomCard from '../components/RoomCard';
import { Alert, EmptyState, Spinner } from '../components/Ui';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    guests: searchParams.get('guests') || ''
  });

  useEffect(() => {
    api.getHotels().then(({ hotels }) => setHotel(hotels[0] || null)).catch(() => {});
  }, []);

  const runSearch = async (params) => {
    setLoading(true);
    setError('');
    try {
      const { rooms } = await api.searchRooms(params);
      setRooms(rooms);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch({
      checkIn: searchParams.get('checkIn') || undefined,
      checkOut: searchParams.get('checkOut') || undefined,
      guests: searchParams.get('guests') || undefined
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.checkIn && form.checkOut && form.checkIn >= form.checkOut) {
      setError('Check-out date must be after the check-in date.');
      return;
    }
    const next = {};
    if (form.checkIn) next.checkIn = form.checkIn;
    if (form.checkOut) next.checkOut = form.checkOut;
    if (form.guests) next.guests = form.guests;
    setSearchParams(next);
  };

  const clearSearch = () => {
    setForm({ checkIn: '', checkOut: '', guests: '' });
    setSearchParams({});
  };

  const hasSearch = searchParams.get('checkIn') && searchParams.get('checkOut');

  return (
    <div>
      <section className="border-b border-line bg-teal text-sand">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="text-sm uppercase tracking-[0.2em] text-brass-light">Nariman Point, Mumbai</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            {hotel ? hotel.name : 'The Meridian Grand'}
          </h1>
          <p className="mt-4 max-w-xl text-sand/80">
            {hotel?.description ||
              'A waterfront hotel with sea-view rooms, an all-day restaurant and a rooftop lounge.'}
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-10 grid gap-3 rounded-xl bg-surface p-4 text-ink shadow-card sm:grid-cols-[1fr_1fr_140px_auto]"
          >
            <div>
              <label className="label">Check-in</label>
              <input
                type="date"
                className="input"
                min={todayISO()}
                value={form.checkIn}
                onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Check-out</label>
              <input
                type="date"
                className="input"
                min={form.checkIn || addDaysISO(1)}
                value={form.checkOut}
                onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Guests</label>
              <input
                type="number"
                min="1"
                max="6"
                className="input"
                placeholder="2"
                value={form.guests}
                onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full">
                Search rooms
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              {hasSearch ? 'Available rooms for your dates' : 'All rooms at The Meridian Grand'}
            </h2>
            {hasSearch && (
              <p className="text-sm text-slate">
                {searchParams.get('checkIn')} &rarr; {searchParams.get('checkOut')}
                {searchParams.get('guests') ? ` &middot; ${searchParams.get('guests')} guest(s)` : ''}
              </p>
            )}
          </div>
          {hasSearch && (
            <button onClick={clearSearch} className="btn-outline">
              Clear search
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {loading ? (
          <Spinner label="Finding rooms&hellip;" />
        ) : rooms.length === 0 ? (
          <EmptyState
            title="No rooms match your search"
            description="Try different dates or a smaller party size."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                checkIn={searchParams.get('checkIn')}
                checkOut={searchParams.get('checkOut')}
                guests={searchParams.get('guests')}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
