import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Alert, EmptyState, Spinner, StatusBadge, formatCurrency, formatDate } from '../components/Ui';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'cancelled', label: 'Cancelled' }
];

export default function MyBookings() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .getMyBookings(token)
      .then(({ bookings }) => setBookings(bookings))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = bookings.filter((b) => {
    if (tab === 'upcoming') return b.status === 'CONFIRMED' && b.checkOut >= today;
    if (tab === 'cancelled') return b.status === 'CANCELLED';
    return true;
  });

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setNotice(null);
    try {
      const res = await api.cancelBooking(cancelTarget.id, '', token);
      setNotice({ variant: 'success', message: res.message });
      load();
    } catch (err) {
      setNotice({ variant: 'error', message: err.message });
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">My bookings</h1>
      <p className="mt-1 text-slate">View your upcoming, past and cancelled stays.</p>

      <div className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'border-teal text-teal' : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {notice && (
          <Alert variant={notice.variant} onClose={() => setNotice(null)}>
            {notice.message}
          </Alert>
        )}
        {error && <Alert variant="error">{error}</Alert>}

        {loading ? (
          <Spinner label="Loading your bookings\u2026" />
        ) : filtered.length === 0 ? (
          <EmptyState title="No bookings here" description="Nothing to show in this view yet." />
        ) : (
          filtered.map((b) => {
            const hoursLeft = (new Date(`${b.checkIn}T00:00:00`).getTime() - Date.now()) / 36e5;
            const canDirectCancel = b.status === 'CONFIRMED' && hoursLeft >= 24;
            const needsRequest = b.status === 'CONFIRMED' && hoursLeft < 24;
            return (
              <div key={b.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold text-ink">
                      {b.room?.roomType} &middot; Room {b.room?.roomNumber}
                    </h3>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate">
                    {formatDate(b.checkIn)} &rarr; {formatDate(b.checkOut)} &middot; {b.numberOfGuests} guest(s)
                  </p>
                  <p className="mt-1 text-xs text-slate">Booking ID: {b.id}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-display text-lg font-semibold text-ink">{formatCurrency(b.totalAmount)}</p>
                  {(canDirectCancel || needsRequest) && (
                    <button onClick={() => setCancelTarget(b)} className="btn-danger">
                      {needsRequest ? 'Request cancellation' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-5">
          <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-card">
            <h3 className="font-display text-lg font-semibold text-ink">
              {(new Date(`${cancelTarget.checkIn}T00:00:00`).getTime() - Date.now()) / 36e5 >= 24
                ? 'Cancel this booking?'
                : 'Submit a cancellation request?'}
            </h3>
            <p className="mt-2 text-sm text-slate">
              {(new Date(`${cancelTarget.checkIn}T00:00:00`).getTime() - Date.now()) / 36e5 >= 24
                ? 'This booking will be cancelled immediately since it is more than 24 hours before check-in.'
                : 'It is less than 24 hours before check-in, so this will be sent to hotel staff for review instead of an immediate cancellation.'}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button className="btn-outline" onClick={() => setCancelTarget(null)} disabled={cancelling}>
                Keep booking
              </button>
              <button className="btn-danger" onClick={confirmCancel} disabled={cancelling}>
                {cancelling ? 'Please wait\u2026' : 'Yes, continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
