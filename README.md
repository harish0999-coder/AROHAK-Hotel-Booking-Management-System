# AROHAK Hackathon — Hotel Booking Management System (MVP + AI Extensions)

A full-stack implementation of the **Mandatory MVP (50 marks)** plus the two **High-Value AI
Extensions (37 marks)** from the AROHAK Hackathon problem statement: user authentication & roles,
single-hotel & room management, customer hotel booking (with overlap-safe availability and the
24-hour cancellation rule), an AI booking assistant, and a RAG chatbot grounded on the hotel's
information PDF.

Built for **The Meridian Grand Mumbai**, the same fictional hotel used in the RAG sample PDF.

## Stack

- **Backend:** Node.js + Express, JWT auth, bcrypt password hashing, a lightweight JSON file store
  (`backend/data/db.json`) — no database installation required, easy to inspect/reset.
- **Frontend:** React (Vite) + Tailwind CSS + React Router — a distinct, hospitality-themed UI (deep
  teal / brass / sand palette, Fraunces + Inter typefaces).
- **AI:** Google Gemini API for both the booking assistant (function calling) and the RAG chatbot
  (embeddings + grounded generation). No other AI/vector-DB service required.

## What's implemented (Mandatory MVP — 50 marks)

1. **User Authentication & Roles (15 marks)**
   - Register (name, email, password, role) and login (email, password), JWT-based sessions.
   - Three roles — Admin, Receptionist, Customer — each with a different permission set enforced
     server-side (not just hidden in the UI).
2. **Single Hotel & Room Management (15 marks)**
   - One standalone hotel (The Meridian Grand Mumbai) with all the specified fields.
   - Rooms with room number, type, capacity, price, availability status, description and amenities.
   - Admin can add/edit/delete rooms and edit hotel info; Admin & Receptionist can toggle room
     availability; inactive rooms can never be booked.
3. **Customer Hotel Booking (20 marks)**
   - Search by check-in, check-out and guest count; room listings show all required fields.
   - Booking captures every field from the spec (booking/customer/organization/hotel/room IDs, dates,
     guests, booking date, total amount, status).
   - Overlapping bookings on the same room are rejected server-side, guarded by a request queue so
     simultaneous booking attempts can't double-book a room.
   - Booking confirmation screen shows booking ID, hotel, room, customer, dates, guests, total and
     status.
   - Cancellation: direct self-cancel up to 24 hours before check-in; after that, the customer submits
     a cancellation request that Admin/Receptionist can approve or reject from the staff Bookings page.

`organizationId` is present on every booking (set to `null` for now) so the Core Extension
(multi-organization architecture) can be added later without a schema change.

## What's implemented (High-Value AI Extensions — 37 marks)

4. **AI Chatbot — Booking Management (20 marks)**
   - `backend/services/bookingTools.js` exposes five controlled functions — `search_rooms`,
     `check_availability`, `get_booking`, `create_booking`, `cancel_booking` — reusing the exact same
     validation and overlap-checking logic as the plain REST routes.
   - `backend/routes/chatbot.js` runs a Gemini function-calling loop: the model decides which tool to
     call, the backend executes it against the real JSON store, and the result is fed back to the
     model. **Gemini never touches the store directly** — this is the "controlled tool/API layer"
     the spec asks for.
   - Try: *"I need a room in Mumbai for 2 people from 2026-09-20 to 2026-09-23"* — it will call
     `search_rooms` / `check_availability`, summarize real options, and book on your confirmation.
5. **AI Chatbot — RAG based on PDF (17 marks)**
   - `backend/data/hotel_knowledge.txt` holds the hotel's policies/facilities/FAQs (the same content as
     the sample PDF), split into sections.
   - `backend/services/rag.js` embeds each section with Gemini and stores the vectors in
     `backend/data/knowledge.json`. At query time it retrieves the top-K most similar sections
     (cosine similarity) and forces Gemini to answer **only** from that retrieved context, explicitly
     refusing to invent facts.
   - Try: *"Is breakfast included?"*, *"What time is check-in?"*, *"Do you have a spa?"* — answers cite
     the source section and refuse anything not in the document.

Both extensions are reachable from the same floating chat widget in the bottom-right corner of the UI
(toggle between "Hotel Info (RAG)" and "Booking Assistant").

## Project structure

```
arohak-hotel-mvp/
├── backend/                    # Express API (port 4000)
│   ├── data/
│   │   ├── store.js            # JSON file "database" + seed data (users, hotel, rooms, bookings)
│   │   ├── db.json             # created on first run
│   │   ├── knowledgeStore.js   # JSON store for RAG chunks + embeddings
│   │   ├── knowledge.json      # created by `npm run ingest`
│   │   └── hotel_knowledge.txt # source text for the RAG chatbot
│   ├── services/
│   │   ├── gemini.js           # Gemini API wrapper (chat/function-calling + embeddings)
│   │   ├── bookingTools.js     # controlled tool layer used by the booking assistant
│   │   └── rag.js              # chunking, embedding, retrieval for the RAG chatbot
│   ├── scripts/ingest.js       # CLI: embeds hotel_knowledge.txt into knowledge.json
│   ├── routes/                 # auth, hotels, rooms, bookings, chatbot, rag
│   └── server.js
└── frontend/                   # React + Vite + Tailwind app (port 5173)
    └── src/
        ├── pages/               # Home, RoomDetail, Login, Register, MyBookings, Staff*
        ├── components/          # ...including ChatWidget.jsx (both AI extensions)
        └── context/AuthContext.jsx
```

## Getting started

Requires Node.js 18+.

### 1. Backend

```bash
cd backend
cp .env.example .env
# edit .env and set GEMINI_API_KEY (get one free at https://aistudio.google.com/apikey)
# to enable the two AI chatbot extensions — the rest of the app works without it
npm install
npm start
```

The API runs at `http://localhost:4000`. On first run it creates `backend/data/db.json` and seeds it
with the hotel, five rooms and one demo user per role:

| Role         | Email                       | Password         |
|--------------|------------------------------|-------------------|
| Admin        | admin@arohak.com            | Admin@123         |
| Receptionist | receptionist@arohak.com     | Reception@123     |
| Customer     | customer@arohak.com         | Customer@123      |

To reset the demo data, stop the server and delete `backend/data/db.json`, then restart.

Once `GEMINI_API_KEY` is set and the server has run at least once (so the hotel is seeded), ingest the
hotel knowledge base for the RAG chatbot:

```bash
npm run ingest
```

Re-run this any time you edit `backend/data/hotel_knowledge.txt`.

### 2. Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend talks to the API at the URL in `frontend/.env`
(`VITE_API_URL`, defaults to `http://localhost:4000/api`).

## Notes for reviewers

- Room search, room details and the hotel listing are public; booking, cancellation, and staff tools
  require login and are additionally protected by role checks on the backend.
- Passwords are hashed with bcrypt; JWTs are signed with `JWT_SECRET` from `backend/.env`.
- The JSON store is fine for a hackathon demo; swapping it for a real database only touches
  `backend/data/store.js` and the route files that call it.
- Gemini model names change fairly often. If a chatbot call fails with a 404 saying a model is "no
  longer available", the error message names the replacement — update `GEMINI_CHAT_MODEL` or
  `GEMINI_EMBED_MODEL` in `backend/.env` to match and restart.
