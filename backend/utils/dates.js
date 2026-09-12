function parseDateOnly(value) {
  // Expect YYYY-MM-DD. Parsed as UTC midnight to avoid timezone drift.
  const d = new Date(`${value}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

function isValidDateString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && parseDateOnly(value) !== null;
}

function nightsBetween(checkIn, checkOut) {
  const inD = parseDateOnly(checkIn);
  const outD = parseDateOnly(checkOut);
  if (!inD || !outD) return 0;
  const ms = outD.getTime() - inD.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Two date ranges [aIn, aOut) and [bIn, bOut) overlap if aIn < bOut && bIn < aOut
function rangesOverlap(aIn, aOut, bIn, bOut) {
  const aInD = parseDateOnly(aIn).getTime();
  const aOutD = parseDateOnly(aOut).getTime();
  const bInD = parseDateOnly(bIn).getTime();
  const bOutD = parseDateOnly(bOut).getTime();
  return aInD < bOutD && bInD < aOutD;
}

// Hours between "now" and a check-in date at 00:00 UTC of that date.
function hoursUntilCheckIn(checkInDateStr) {
  const checkIn = parseDateOnly(checkInDateStr);
  const now = new Date();
  return (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);
}

module.exports = {
  parseDateOnly,
  isValidDateString,
  nightsBetween,
  rangesOverlap,
  hoursUntilCheckIn
};
