import React, { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const MODES = { INFO: 'info', BOOKING: 'booking' };

export default function ChatWidget({ hotelId }) {
  const { user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(MODES.INFO);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState({
    [MODES.INFO]: [
      {
        role: 'model',
        text: "Ask me anything about The Meridian Grand Mumbai — policies, amenities, timings, facilities. I only answer from the hotel's official document."
      }
    ],
    [MODES.BOOKING]: [
      { role: 'model', text: "Hi! Tell me your dates, city, and number of guests and I'll help you find and book a room." }
    ]
  });
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, open, mode]);

  const currentMessages = messages[mode];
  const pushMessage = (m) => setMessages((prev) => ({ ...prev, [mode]: [...prev[mode], m] }));

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    pushMessage({ role: 'user', text });
    setLoading(true);

    try {
      if (mode === MODES.INFO) {
        const data = await api.chatHotelInfo(hotelId, text);
        const sourceNote = data.sources?.length
          ? `\n\n— sourced from: ${data.sources.map((s) => s.section).join(', ')}`
          : '';
        pushMessage({ role: 'model', text: data.answer + sourceNote });
      } else if (!user || user.role !== 'customer') {
        pushMessage({
          role: 'model',
          text: user
            ? 'The booking assistant works with customer accounts. Please sign in as a customer to book through chat.'
            : 'Please sign in first so I can manage bookings on your behalf.'
        });
      } else {
        const history = currentMessages.slice(1).map((m) => ({ role: m.role, text: m.text }));
        const data = await api.chatBooking(text, history, token);
        pushMessage({ role: 'model', text: data.reply });
      }
    } catch (err) {
      pushMessage({ role: 'model', text: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 flex h-[32rem] w-[22rem] flex-col rounded-xl border border-line bg-surface shadow-card sm:w-96">
          <div className="rounded-t-xl border-b border-line bg-sand px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-semibold text-ink">Meridian Assistant</p>
              <button onClick={() => setOpen(false)} className="text-slate hover:text-ink" aria-label="Close chat">
                &#10005;
              </button>
            </div>
            <div className="mt-3 flex gap-2 text-xs">
              <button
                onClick={() => setMode(MODES.INFO)}
                className={`flex-1 rounded-md border px-2 py-1.5 transition-colors ${
                  mode === MODES.INFO ? 'border-teal bg-teal/10 text-teal-dark' : 'border-line text-slate hover:text-ink'
                }`}
              >
                Hotel Info (RAG)
              </button>
              <button
                onClick={() => setMode(MODES.BOOKING)}
                className={`flex-1 rounded-md border px-2 py-1.5 transition-colors ${
                  mode === MODES.BOOKING ? 'border-teal bg-teal/10 text-teal-dark' : 'border-line text-slate hover:text-ink'
                }`}
              >
                Booking Assistant
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-surface px-4 py-4">
            {currentMessages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === 'user' ? 'ml-auto bg-teal text-sand' : 'border border-line bg-sand/60 text-ink'
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && <div className="text-xs text-slate">Thinking…</div>}
          </div>

          <div className="flex gap-2 border-t border-line bg-surface p-3 rounded-b-xl">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={mode === MODES.INFO ? 'e.g. Is breakfast included?' : 'e.g. 2 guests in Mumbai, 2026-09-20 to 2026-09-23'}
              className="input !py-2 text-sm"
            />
            <button onClick={send} disabled={loading} className="btn-primary !px-4">
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-teal text-sand shadow-card transition-colors hover:bg-teal-dark"
        aria-label="Toggle chat assistant"
      >
        {open ? '\u2715' : '\uD83D\uDCAC'}
      </button>
    </div>
  );
}
