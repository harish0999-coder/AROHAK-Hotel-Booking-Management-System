import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-sm font-medium transition-colors ${
          isActive ? 'text-teal' : 'text-ink/70 hover:text-ink'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-sand/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="7" fill="#1F4B4A" />
            <path d="M8 22V11l8-4 8 4v11" stroke="#F6F1E9" strokeWidth="1.6" fill="none" />
            <rect x="13" y="16" width="6" height="6" fill="#B98A4A" />
          </svg>
          <div className="leading-tight">
            <p className="font-display text-base font-semibold text-ink">The Meridian Grand</p>
            <p className="text-[11px] tracking-wide text-slate">AROHAK Hotel Booking</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <NavItem to="/rooms">Rooms</NavItem>
          {user?.role === 'customer' && <NavItem to="/my-bookings">My bookings</NavItem>}
          {(user?.role === 'admin' || user?.role === 'receptionist') && (
            <>
              <NavItem to="/staff/rooms">Manage rooms</NavItem>
              <NavItem to="/staff/bookings">Bookings</NavItem>
              {user?.role === 'admin' && <NavItem to="/staff/hotel">Hotel info</NavItem>}
            </>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <div className="text-right leading-tight">
                <p className="text-sm font-medium text-ink">{user.name}</p>
                <p className="text-xs capitalize text-slate">{user.role}</p>
              </div>
              <button onClick={handleLogout} className="btn-outline">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-outline">
                Log in
              </Link>
              <Link to="/register" className="btn-primary">
                Create account
              </Link>
            </>
          )}
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-md border border-line md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className="text-lg">{menuOpen ? '\u2715' : '\u2630'}</span>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-line px-5 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <NavItem to="/rooms">Rooms</NavItem>
            {user?.role === 'customer' && <NavItem to="/my-bookings">My bookings</NavItem>}
            {(user?.role === 'admin' || user?.role === 'receptionist') && (
              <>
                <NavItem to="/staff/rooms">Manage rooms</NavItem>
                <NavItem to="/staff/bookings">Bookings</NavItem>
                {user?.role === 'admin' && <NavItem to="/staff/hotel">Hotel info</NavItem>}
              </>
            )}
            <div className="mt-2 flex gap-3 border-t border-line pt-4">
              {user ? (
                <button onClick={handleLogout} className="btn-outline w-full">
                  Log out ({user.name})
                </button>
              ) : (
                <>
                  <Link to="/login" className="btn-outline w-full">
                    Log in
                  </Link>
                  <Link to="/register" className="btn-primary w-full">
                    Create account
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
