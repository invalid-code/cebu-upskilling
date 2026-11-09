// Shared inline-style constants.
// Rule: only spread these where the style object is byte-identical to the
// original definition; always spread first and override after (`{...pageTitle, lineHeight: .95}`).

export const centeredPage = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'var(--bg)',
  padding: 20,
};

export const pageTitle = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(2rem, 4vw, 3.3rem)',
};

export const pageTitleCompact = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
  margin: 0,
};

export const eyebrow = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontWeight: 700,
  color: 'var(--coral)',
  marginBottom: 12,
};

export const headingRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'end',
  gap: 22,
  marginBottom: 28,
};

export const pageSubtitle = {
  color: 'var(--muted)',
  margin: '8px 0 0',
  maxWidth: 450,
};

export const metaText = {
  fontSize: 12,
  color: 'var(--muted)',
};

export const metaTextFlush = {
  fontSize: 12,
  color: 'var(--muted)',
  margin: 0,
};

export const authSubtitle = {
  fontSize: 13,
  color: 'var(--muted)',
  textAlign: 'center',
  marginBottom: 24,
};

export const chipTeal = {
  background: 'var(--teal-soft)',
  color: 'var(--teal)',
};

export const chipCoral = {
  background: 'var(--coral-soft)',
  color: 'var(--coral)',
};

export const chipGood = {
  background: 'var(--good-soft)',
  color: 'var(--good)',
};

// Auth screens (login / register / forgot / reset) share this layout kit.
export const authStyles = {
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--muted)',
    marginBottom: 6,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 18,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    boxShadow: 'var(--shadow)',
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 11,
    background: 'var(--coral)',
    display: 'grid',
    placeItems: 'center',
    color: 'var(--surface)',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 18,
  },
  title: {
    fontSize: 22,
    fontFamily: 'var(--font-display)',
    textAlign: 'center',
    marginBottom: 4,
  },
  field: {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    minHeight: 42,
    padding: '9px 12px',
    color: 'var(--ink)',
    marginBottom: 4,
    fontSize: 14,
  },
  fieldError: {
    color: 'var(--danger)',
    fontSize: 12,
    marginBottom: 12,
    marginTop: 2,
  },
  error: {
    background: 'var(--coral-soft)',
    color: 'var(--coral-ink)',
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 12,
    marginBottom: 12,
  },
  link: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
    color: 'var(--muted)',
  },
};
