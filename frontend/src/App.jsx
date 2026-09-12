import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ChatWidget from './components/ChatWidget';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RoomDetail from './pages/RoomDetail';
import MyBookings from './pages/MyBookings';
import StaffRooms from './pages/StaffRooms';
import StaffBookings from './pages/StaffBookings';
import StaffHotel from './pages/StaffHotel';
import NotFound from './pages/NotFound';
import { api } from './lib/api';

export default function App() {
  const [hotelId, setHotelId] = useState(null);

  // Fetch the hotel so the RAG chat widget knows which hotel's knowledge base
  // to query. In a multi-hotel setup this would be whichever hotel the guest
  // is currently browsing/booking.
  useEffect(() => {
    api
      .getHotels()
      .then(({ hotels }) => {
        if (hotels?.length) setHotelId(hotels[0].id);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/rooms" replace />} />
          <Route path="/rooms" element={<Home />} />
          <Route path="/rooms/:id" element={<RoomDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute roles={['customer']}>
                <MyBookings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/staff/rooms"
            element={
              <ProtectedRoute roles={['admin', 'receptionist']}>
                <StaffRooms />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/bookings"
            element={
              <ProtectedRoute roles={['admin', 'receptionist']}>
                <StaffBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/hotel"
            element={
              <ProtectedRoute roles={['admin']}>
                <StaffHotel />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="border-t border-line bg-surface py-6 text-center text-xs text-slate">
        AROHAK Hackathon Hiring &middot; Hotel Booking Management System &middot; MVP + AI Extensions
      </footer>
      {hotelId && <ChatWidget hotelId={hotelId} />}
    </div>
  );
}
