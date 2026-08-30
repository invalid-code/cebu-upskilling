import { useEffect, useState } from 'react';

const baseStyle = {
  display: 'grid',
  placeItems: 'center',
  borderRadius: 12,
  overflow: 'hidden',
  flexShrink: 0,
  fontWeight: 700,
  fontFamily: "'Space Grotesk', sans-serif",
};

function initialsFor(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

/**
 * Renders a company logo image with a graceful initials fallback.
 * Falls back whenever the URL is missing or fails to load.
 */
export default function CompanyAvatar({ name = '', src = '', size = 44 }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        style={{
          ...baseStyle,
          width: size,
          height: size,
          background: 'var(--sand, #e8dfd1)',
          color: 'var(--teal, #1a6b5a)',
          fontSize: Math.max(11, Math.round(size * 0.34)),
        }}
        aria-hidden="true"
      >
        {initialsFor(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${name} logo`}
      style={{ ...baseStyle, width: size, height: size, objectFit: 'cover' }}
      onError={() => setFailed(true)}
    />
  );
}
