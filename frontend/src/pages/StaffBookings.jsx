import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Alert, EmptyState, Spinner, StatusBadge, formatCurrency, formatDate } from '../components/Ui';

const STATUS_FILTERS = ['ALL', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];

export default function StaffBookings() {
  const { token } = useAuth();
  const [view, setView] = useState('bookings'); // 'bookings' | 'requests'

  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loadingBookings, setLoadingBookings] = useState(true);

  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);

  const loadBookings = () => {
    setLoadingBookings(true);
    api
      .getAllBookings(token, statusFilter !== 'ALL' ? { status: statusFilter } : {})
      .then(({ bookings }) => setBookings(bookings))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingBookings(false));
  };

  const loadRequests = () => {
    setLoadingRequests(true);
    api
      .getCancellationRequests(token, 'PENDING')
      .then(({ cancellationRequests }) => setRequests(cancellationRequests))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingRequests(false));
  };

  useEffect(loadBookings, [token, statusFilter]);
  useEffect(loadRequests, [token]);

  const resolveRequest = async (id, decision) => {
    setNotice(null);
    try {
      await api.resolveCancellationRequest(id, decision, token);
      setNotice({
        variant: 'success',
        message: decision === 'APPROVE' ? 'Cancellation approved.' : 'Cancellation request rejected.'
      });
      loadRequests();
      loadBookings();
    } catch (err) {
      setNotice({ variant: 'error', message: err.message });
    }
  };

  const markCompleted = async (booking) => {
    try {
      await api.setBookingStatus(booking.id, 'COMPLETED', token);
      loadBookings();
    } catch (err) {
      setNotice({ variant: 'error', message: err.message });
    }
  };

  const visibleBookings = bookings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.customer?.name?.toLowerCase().includes(q) ||
      b.customer?.email?.toLowerCase().includes(q) ||
      b.room?.roomNumber?.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">Bookings</h1>
      <p className="mt-1 text-slate">Search bookings and review cancellation requests.</p>

      <div className="mt-6 flex gap-1 border-b border-line">
        <button
          onClick={() => setView('bookings')}
          className={`border-b-2 px-4 py-2.5 text-sm font-medium ${
            view === 'bookings' ? 'border-teal text-teal' : 'border-transparent text-slate hover:text-ink'
          }`}
        >
          All bookings
        </button>
        <button
          onClick={() => setView('requests')}
          className={`relative border-b-2 px-4 py-2.5 text-sm font-medium ${
            view === 'requests' ? 'border-teal text-teal' : 'border-transparent text-slate hover:text-ink'
          }`}
        >
          Cancellation requests
          {requests.length > 0 && (
            <span className="ml-1.5 rounded-full bg-brass px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {requests.length}
            </span>
          )}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {notice && (
          <Alert variant={notice.variant} onClose={() => setNotice(null)}>
            {notice.message}
          </Alert>
        )}
        {error && <Alert variant="error">{error}</Alert>}
      </div>

      {view === 'bookings' ? (
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              className="input max-w-xs"
              placeholder="Search by guest, room or booking ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    statusFilter === s ? 'border-teal bg-teal/10 text-teal-dark' : 'border-line text-slate'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {loadingBookings ? (
            <Spinner label="Loading bookings\u2026" />
          ) : visibleBookings.length === 0 ? (
            <EmptyState title="No bookings found" description="Try a different filter or search term." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-sand text-xs uppercase tracking-wide text-slate">
                  <tr>
                    <th className="px-4 py-3">Guest</th>
                    <th className="px-4 py-3">Room</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Guests</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface">
                  {visibleBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{b.customer?.name}</p>
                        <p className="text-xs text-slate">{b.customer?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-ink/80">
                        {b.room?.roomType} &middot; {b.room?.roomNumber}
                      </td>
                      <td className="px-4 py-3 text-ink/80">
                        {formatDate(b.checkIn)} &rarr; {formatDate(b.checkOut)}
                      </td>
                      <td className="px-4 py-3 text-ink/80">{b.numberOfGuests}</td>
                      <td className="px-4 py-3 text-ink/80">{formatCurrency(b.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.status === 'CONFIRMED' && b.checkOut < new Date().toISOString().slice(0, 10) && (
                          <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => markCompleted(b)}>
                            Mark completed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {loadingRequests ? (
            <Spinner label="Loading cancellation requests\u2026" />
          ) : requests.length === 0 ? (
            <EmptyState
              title="No pending cancellation requests"
              description="Requests appear here when a customer cancels within 24 hours of check-in."
            />
          ) : (
            <div className="space-y-4">
              {requests.map((r) => (
                <div key={r.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold text-ink">
                      {r.booking?.room?.roomType} &middot; Room {r.booking?.room?.roomNumber}
                    </p>
                    <p className="mt-1 text-sm text-slate">
                      Guest: {r.booking?.customer?.name} ({r.booking?.customer?.email})
                    </p>
                    <p className="text-sm text-slate">
                      {formatDate(r.booking?.checkIn)} &rarr; {formatDate(r.booking?.checkOut)} &middot;{' '}
                      {formatCurrency(r.booking?.totalAmount)}
                    </p>
                    {r.reason && <p className="mt-1 text-sm italic text-slate">"{r.reason}"</p>}
                  </div>
                  <div className="flex gap-3">
                    <button className="btn-danger" onClick={() => resolveRequest(r.id, 'REJECT')}>
                      Reject
                    </button>
                    <button className="btn-primary" onClick={() => resolveRequest(r.id, 'APPROVE')}>
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
