import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Alert, Spinner, formatCurrency, formatDate } from '../components/Ui';

function nightsBetween(a, b) {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export default function RoomDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    numberOfGuests: searchParams.get('guests') || '1'
  });

  const load = () => {
    setLoading(true);
    api
      .getRoom(id, { checkIn: form.checkIn, checkOut: form.checkOut })
      .then(({ room }) => setRoom(room))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (form.checkIn && form.checkOut) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.checkIn, form.checkOut]);

  const nights = nightsBetween(form.checkIn, form.checkOut);
  const total = room ? nights * room.pricePerNight : 0;

  const handleBook = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!user) {
      navigate('/login', { state: { from: { pathname: `/rooms/${id}` } } });
      return;
    }
    if (user.role !== 'customer') {
      setSubmitError('Only customer accounts can make bookings.');
      return;
    }
    if (!form.checkIn || !form.checkOut) {
      setSubmitError('Please choose a check-in and check-out date.');
      return;
    }
    if (form.checkIn >= form.checkOut) {
      setSubmitError('Check-out date must be after the check-in date.');
      return;
    }
    if (Number(form.numberOfGuests) > room.capacity) {
      setSubmitError(`This room accommodates up to ${room.capacity} guest(s).`);
      return;
    }

    setSubmitting(true);
    try {
      const { booking } = await api.createBooking(
        {
          roomId: room.id,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          numberOfGuests: Number(form.numberOfGuests)
        },
        token
      );
      setSuccess(booking);
    } catch (err) {
      setSubmitError(err.message);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !room) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16">
        <Spinner label="Loading room&hellip;" />
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal/10 text-teal">
            &#10003;
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">Booking confirmed</h1>
          <p className="mt-2 text-slate">Here are your booking details.</p>

          <dl className="mt-6 grid grid-cols-2 gap-y-3 text-left text-sm">
            <dt className="text-slate">Booking ID</dt>
            <dd className="text-right font-mono text-xs text-ink">{success.id}</dd>
            <dt className="text-slate">Hotel</dt>
            <dd className="text-right text-ink">{success.hotel?.name}</dd>
            <dt className="text-slate">Room</dt>
            <dd className="text-right text-ink">
              {success.room?.roomType} &middot; Room {success.room?.roomNumber}
            </dd>
            <dt className="text-slate">Check-in</dt>
            <dd className="text-right text-ink">{formatDate(success.checkIn)}</dd>
            <dt className="text-slate">Check-out</dt>
            <dd className="text-right text-ink">{formatDate(success.checkOut)}</dd>
            <dt className="text-slate">Guests</dt>
            <dd className="text-right text-ink">{success.numberOfGuests}</dd>
            <dt className="text-slate">Total amount</dt>
            <dd className="text-right font-semibold text-ink">{formatCurrency(success.totalAmount)}</dd>
            <dt className="text-slate">Status</dt>
            <dd className="text-right text-ink">{success.status}</dd>
          </dl>

          <div className="mt-8 flex justify-center gap-3">
            <Link to="/my-bookings" className="btn-primary">
              View my bookings
            </Link>
            <Link to="/rooms" className="btn-outline">
              Browse more rooms
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <Link to="/rooms" className="text-sm text-teal hover:underline">
        &larr; Back to rooms
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{room.roomType}</h1>
          <p className="mt-1 text-slate">
            Room {room.roomNumber} &middot; Sleeps up to {room.capacity} guest(s)
          </p>
          <div className="mt-5 h-56 w-full rounded-xl bg-gradient-to-br from-teal to-teal-light" />
          <p className="mt-6 text-ink/80">{room.description}</p>

          <h2 className="mt-8 font-display text-lg font-semibold text-ink">Amenities</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-ink/80 sm:grid-cols-3">
            {(room.amenities || []).map((a) => (
              <li key={a} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brass" />
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div className="card sticky top-24 h-fit p-6">
          <p className="font-display text-2xl font-semibold text-ink">
            {formatCurrency(room.pricePerNight)}
            <span className="text-sm font-normal text-slate"> / night</span>
          </p>

          <form onSubmit={handleBook} className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Check-in</label>
                <input
                  type="date"
                  required
                  className="input"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.checkIn}
                  onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Check-out</label>
                <input
                  type="date"
                  required
                  className="input"
                  min={form.checkIn || new Date().toISOString().slice(0, 10)}
                  value={form.checkOut}
                  onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Number of guests</label>
              <input
                type="number"
                min="1"
                max={room.capacity}
                required
                className="input"
                value={form.numberOfGuests}
                onChange={(e) => setForm((f) => ({ ...f, numberOfGuests: e.target.value }))}
              />
            </div>

            {form.checkIn && form.checkOut && room.isAvailableForDates === false && (
              <Alert variant="error">This room is already booked for the selected dates.</Alert>
            )}

            {nights > 0 && (
              <div className="rounded-lg bg-sand p-3 text-sm text-ink/80">
                <div className="flex justify-between">
                  <span>
                    {formatCurrency(room.pricePerNight)} &times; {nights} night{nights > 1 ? 's' : ''}
                  </span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold text-ink">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            )}

            {submitError && <Alert variant="error">{submitError}</Alert>}

            <button
              type="submit"
              disabled={submitting || (form.checkIn && form.checkOut && room.isAvailableForDates === false)}
              className="btn-primary w-full"
            >
              {submitting ? 'Booking\u2026' : user ? 'Confirm booking' : 'Log in to book'}
            </button>
            {!user && <p className="text-center text-xs text-slate">You'll need a customer account to book.</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
