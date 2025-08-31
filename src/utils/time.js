export const toTime = (secs = 0) => {
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  const m = Math.floor((secs / 60) % 60).toString().padStart(2, '0');
  const h = Math.floor(secs / 3600);
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

export const timeAgo = (ts) => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w`;
  const mo = Math.floor(d / 30);
  return `${mo}mo`;
}