import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Alert, Spinner } from '../components/Ui';

export default function StaffHotel() {
  const { token } = useAuth();
  const [hotel, setHotel] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    api
      .getHotels()
      .then(({ hotels }) => {
        const h = hotels[0];
        setHotel(h);
        setForm(h);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const { hotel: updated } = await api.updateHotel(hotel.id, form, token);
      setHotel(updated);
      setNotice({ variant: 'success', message: 'Hotel information updated.' });
    } catch (err) {
      setNotice({ variant: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <Spinner label="Loading hotel information\u2026" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">Hotel information</h1>
      <p className="mt-1 text-slate">Keep the hotel's public details up to date.</p>

      <form onSubmit={handleSave} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="label">Hotel ID</label>
          <input className="input bg-sand" value={hotel.id} disabled />
        </div>
        <div>
          <label className="label">Hotel name</label>
          <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">City</label>
            <input className="input" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Address</label>
          <input
            className="input"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Contact number</label>
            <input
              className="input"
              value={form.contactNumber}
              onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            rows={4}
            className="input"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        {notice && <Alert variant={notice.variant}>{notice.message}</Alert>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving\u2026' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
