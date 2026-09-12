const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (err) {
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    const message = (data && data.message) || `Request failed with status ${res.status}.`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // auth
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: (token) => request('/auth/me', { token }),

  // hotels
  getHotels: () => request('/hotels'),
  getHotel: (id) => request(`/hotels/${id}`),
  updateHotel: (id, payload, token) => request(`/hotels/${id}`, { method: 'PUT', body: payload, token }),

  // rooms
  searchRooms: (params) => {
    const qs = new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return request(`/rooms${qs ? `?${qs}` : ''}`);
  },
  getAllRoomsForStaff: (token, hotelId) =>
    request(`/rooms/all${hotelId ? `?hotelId=${hotelId}` : ''}`, { token }),
  getRoom: (id, params) => {
    const qs = new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return request(`/rooms/${id}${qs ? `?${qs}` : ''}`);
  },
  createRoom: (payload, token) => request('/rooms', { method: 'POST', body: payload, token }),
  updateRoom: (id, payload, token) => request(`/rooms/${id}`, { method: 'PUT', body: payload, token }),
  setRoomAvailability: (id, availabilityStatus, token) =>
    request(`/rooms/${id}/availability`, { method: 'PATCH', body: { availabilityStatus }, token }),
  deleteRoom: (id, token) => request(`/rooms/${id}`, { method: 'DELETE', token }),

  // bookings
  createBooking: (payload, token) => request('/bookings', { method: 'POST', body: payload, token }),
  getMyBookings: (token) => request('/bookings/mine', { token }),
  getAllBookings: (token, params) => {
    const qs = new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return request(`/bookings${qs ? `?${qs}` : ''}`, { token });
  },
  getBooking: (id, token) => request(`/bookings/${id}`, { token }),
  cancelBooking: (id, reason, token) =>
    request(`/bookings/${id}/cancel`, { method: 'POST', body: { reason }, token }),
  setBookingStatus: (id, status, token) =>
    request(`/bookings/${id}/status`, { method: 'PATCH', body: { status }, token }),
  getCancellationRequests: (token, status) =>
    request(`/bookings/cancellation-requests/all${status ? `?status=${status}` : ''}`, { token }),
  resolveCancellationRequest: (id, decision, token) =>
    request(`/bookings/cancellation-requests/${id}`, { method: 'PATCH', body: { decision }, token }),

  // AI extensions
  chatBooking: (message, history, token) =>
    request('/chatbot/booking', { method: 'POST', body: { message, history }, token }),
  chatHotelInfo: (hotelId, question) =>
    request('/rag/hotel-info', { method: 'POST', body: { hotelId, question } }),
  ingestHotelKnowledge: (hotelId, token) => request(`/rag/ingest/${hotelId}`, { method: 'POST', token })
};
