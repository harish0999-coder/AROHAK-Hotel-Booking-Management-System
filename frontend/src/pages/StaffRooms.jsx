import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Alert, EmptyState, Spinner, StatusBadge, formatCurrency } from '../components/Ui';

const EMPTY_FORM = {
  roomNumber: '',
  roomType: '',
  capacity: 2,
  pricePerNight: '',
  description: '',
  amenities: ''
};

export default function StaffRooms() {
  const { user, token } = useAuth();
  const isAdmin = user.role === 'admin';

  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.getHotels(), api.getAllRoomsForStaff(token)])
      .then(([{ hotels }, { rooms }]) => {
        setHotel(hotels[0] || null);
        setRooms(rooms);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const openCreate = () => {
    setEditingRoom(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (room) => {
    setEditingRoom(room);
    setForm({
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      capacity: room.capacity,
      pricePerNight: room.pricePerNight,
      description: room.description || '',
      amenities: (room.amenities || []).join(', ')
    });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    const payload = {
      roomNumber: form.roomNumber,
      roomType: form.roomType,
      capacity: Number(form.capacity),
      pricePerNight: Number(form.pricePerNight),
      description: form.description,
      amenities: form.amenities
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)
    };
    try {
      if (editingRoom) {
        await api.updateRoom(editingRoom.id, payload, token);
        setNotice({ variant: 'success', message: 'Room updated.' });
      } else {
        await api.createRoom({ ...payload, hotelId: hotel.id }, token);
        setNotice({ variant: 'success', message: 'Room added.' });
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setNotice({ variant: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (room) => {
    const next = room.availabilityStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.setRoomAvailability(room.id, next, token);
      load();
    } catch (err) {
      setNotice({ variant: 'error', message: err.message });
    }
  };

  const handleDelete = async (room) => {
    if (!confirm(`Delete room ${room.roomNumber}? This cannot be undone.`)) return;
    try {
      await api.deleteRoom(room.id, token);
      setNotice({ variant: 'success', message: 'Room deleted.' });
      load();
    } catch (err) {
      setNotice({ variant: 'error', message: err.message });
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Manage rooms</h1>
          <p className="mt-1 text-slate">{hotel?.name}</p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={openCreate}>
            + Add room
          </button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {notice && (
          <Alert variant={notice.variant} onClose={() => setNotice(null)}>
            {notice.message}
          </Alert>
        )}
        {error && <Alert variant="error">{error}</Alert>}
      </div>

      <div className="mt-4">
        {loading ? (
          <Spinner label="Loading rooms\u2026" />
        ) : rooms.length === 0 ? (
          <EmptyState title="No rooms yet" description="Add the first room to get started." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-sand text-xs uppercase tracking-wide text-slate">
                <tr>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Price/night</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td className="px-4 py-3 font-medium text-ink">{room.roomNumber}</td>
                    <td className="px-4 py-3 text-ink/80">{room.roomType}</td>
                    <td className="px-4 py-3 text-ink/80">{room.capacity}</td>
                    <td className="px-4 py-3 text-ink/80">{formatCurrency(room.pricePerNight)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={room.availabilityStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => toggleAvailability(room)}>
                          {room.availabilityStatus === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        {isAdmin && (
                          <>
                            <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => openEdit(room)}>
                              Edit
                            </button>
                            <button className="btn-danger !py-1.5 !px-3 text-xs" onClick={() => handleDelete(room)}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-5 py-8">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-card">
            <h3 className="font-display text-lg font-semibold text-ink">
              {editingRoom ? `Edit room ${editingRoom.roomNumber}` : 'Add a new room'}
            </h3>
            <form onSubmit={handleSave} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Room number</label>
                  <input
                    required
                    className="input"
                    value={form.roomNumber}
                    onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="input"
                    value={form.capacity}
                    onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="label">Room type</label>
                <input
                  required
                  className="input"
                  placeholder="e.g. Deluxe King"
                  value={form.roomType}
                  onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Price per night (INR)</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="input"
                  value={form.pricePerNight}
                  onChange={(e) => setForm((f) => ({ ...f, pricePerNight: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Amenities (comma separated)</label>
                <input
                  className="input"
                  placeholder="Wi-Fi, Air conditioning, Smart TV"
                  value={form.amenities}
                  onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-outline" onClick={() => setFormOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving\u2026' : editingRoom ? 'Save changes' : 'Add room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
