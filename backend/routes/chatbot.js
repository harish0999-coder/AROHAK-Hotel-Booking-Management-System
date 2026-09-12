const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { generateContent, extractText, extractFunctionCalls } = require('../services/gemini');
const {
  bookingToolDeclarations,
  search_rooms,
  check_availability,
  get_booking,
  create_booking,
  cancel_booking
} = require('../services/bookingTools');

const router = express.Router();

const TOOL_IMPL = { search_rooms, check_availability, get_booking, create_booking, cancel_booking };

const SYSTEM_INSTRUCTION = `You are the booking assistant for The Meridian Grand Mumbai hotel group.
You help guests search rooms, check availability, create bookings, view bookings, and cancel bookings.
Rules you must always follow:
- Never invent room availability, prices, or booking data. Only use information returned by the provided tools.
- Always call check_availability before confirming any new booking.
- Before calling create_booking, briefly confirm the room, dates, guests and total cost with the user in your reply, unless they already explicitly confirmed.
- If a tool returns an error, explain it plainly to the user and suggest what to do next.
- Keep replies concise, friendly, and focused on the booking task.
- Dates must be in YYYY-MM-DD format. You cannot access any data outside of the tools provided - do not guess.`;

// POST /api/chatbot/booking  (Customer only - acts on behalf of the signed-in user)
// body: { message: string, history?: [{ role: "user"|"model", text: string }] }
router.post('/booking', authenticate, authorize('customer'), async (req, res, next) => {
  try {
    const { message, history = [] } = req.body || {};
    if (!message) return res.status(400).json({ message: 'message is required.' });

    const contents = [
      ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: message }] }
    ];

    let finalText = '';
    const toolTrace = [];

    // Function-calling loop: allow up to 4 tool round-trips per user turn.
    for (let step = 0; step < 4; step++) {
      const response = await generateContent(contents, {
        tools: bookingToolDeclarations,
        systemInstruction: SYSTEM_INSTRUCTION
      });

      const calls = extractFunctionCalls(response);
      if (calls.length === 0) {
        finalText = extractText(response);
        break;
      }

      // Record the model's function-call turn
      contents.push({ role: 'model', parts: calls.map((c) => ({ functionCall: c })) });

      // Execute each requested tool call against our controlled backend layer.
      // Gemini's current API expects tool results back with role "user".
      const functionResponseParts = [];
      for (const call of calls) {
        const fn = TOOL_IMPL[call.name];
        let result;
        if (!fn) {
          result = { error: `Unknown tool: ${call.name}` };
        } else {
          try {
            result = await fn(call.args || {}, req.user);
          } catch (err) {
            result = { error: err.message };
          }
        }
        toolTrace.push({ name: call.name, args: call.args, result });
        functionResponseParts.push({ functionResponse: { name: call.name, response: result } });
      }
      contents.push({ role: 'user', parts: functionResponseParts });
    }

    if (!finalText) {
      finalText = "I wasn't able to complete that request right now. Could you rephrase or try again?";
    }

    res.json({ reply: finalText, toolTrace });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
