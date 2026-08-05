const variants = {
  default: {
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
  },
  review: {
    background: 'var(--sand)',
    color: 'rgb(100, 85, 50)',
  },
  interview: {
    background: 'var(--coral-soft)',
    color: 'rgb(110, 65, 45)',
  },
};

const base = {
  display: 'inline-flex',
  padding: '5px 8px',
  borderRadius: 7,
  fontSize: 11,
  fontWeight: 700,
};

export default function StatusBadge({ status = 'default' }) {
  return (
    <span className={`status ${status}`} style={{ ...base, ...variants[status] }}>
      {status === 'default' && 'Saved'}
      {status === 'review' && 'Under review'}
      {status === 'interview' && 'Interview'}
    </span>
  );
}
