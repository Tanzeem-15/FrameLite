export const toTime = (secs = 0) => {
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  const m = Math.floor((secs / 60) % 60).toString().padStart(2, '0');
  const h = Math.floor(secs / 3600);
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};
