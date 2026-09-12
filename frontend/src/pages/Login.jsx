import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Ui';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@arohak.com', password: 'Admin@123' },
  { role: 'Receptionist', email: 'receptionist@arohak.com', password: 'Reception@123' },
  { role: 'Customer', email: 'customer@arohak.com', password: 'Customer@123' }
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = (user) => {
    const from = location.state?.from?.pathname;
    if (from) return navigate(from, { replace: true });
    if (user.role === 'admin' || user.role === 'receptionist') return navigate('/staff/rooms', { replace: true });
    navigate('/rooms', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      redirectTo(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc) => setForm({ email: acc.email, password: acc.password });

  return (
    <div className="mx-auto grid max-w-4xl gap-8 px-5 py-16 lg:grid-cols-[1fr_1fr]">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Welcome back</h1>
        <p className="mt-2 text-slate">Log in to manage your bookings, rooms or the hotel.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
              className="input"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Logging in\u2026' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-teal hover:underline">
            Create one
          </Link>
        </p>
      </div>

      <div className="card h-fit p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Try a demo account</h2>
        <p className="mt-1 text-sm text-slate">Explore each role without registering.</p>
        <div className="mt-4 space-y-3">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              onClick={() => fillDemo(acc)}
              className="flex w-full items-center justify-between rounded-lg border border-line px-4 py-3 text-left text-sm hover:border-teal"
            >
              <span>
                <span className="block font-medium text-ink">{acc.role}</span>
                <span className="text-xs text-slate">{acc.email}</span>
              </span>
              <span className="text-xs text-teal">Use&nbsp;this</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
