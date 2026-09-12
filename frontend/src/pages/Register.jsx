import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Ui';

const ROLES = [
  { value: 'customer', label: 'Customer', hint: 'Browse rooms and make bookings' },
  { value: 'receptionist', label: 'Receptionist', hint: 'Manage rooms, availability and bookings' },
  { value: 'admin', label: 'Admin', hint: 'Manage the hotel, rooms and bookings' }
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register(form);
      if (user.role === 'admin' || user.role === 'receptionist') navigate('/staff/rooms');
      else navigate('/rooms');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-3xl font-semibold text-ink">Create your account</h1>
      <p className="mt-2 text-slate">Register to book rooms or to manage the hotel.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label">Full name</label>
          <input
            type="text"
            required
            className="input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Email address</label>
          <input
            type="email"
            required
            className="input"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            required
            minLength={6}
            className="input"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <p className="mt-1 text-xs text-slate">At least 6 characters.</p>
        </div>
        <div>
          <label className="label">Role</label>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                  form.role === r.value ? 'border-teal bg-teal/5' : 'border-line'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r.value}
                  checked={form.role === r.value}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-medium text-ink">{r.label}</span>
                  <span className="text-xs text-slate">{r.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating account\u2026' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-teal hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
