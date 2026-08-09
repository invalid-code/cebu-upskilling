const styles = {
  card: {
    background: 'var(--surface)',
    borderRadius: 16,
  },
  eyebrow: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: 700,
    color: 'var(--coral)',
    marginBottom: 12,
  },
  roleName: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--ink)',
    margin: '0 0 8px',
  },
  location: {
    fontSize: 14,
    color: 'var(--muted)',
    marginBottom: 20,
  },
  banner: {
    background: 'var(--coral-soft)',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 13,
    color: 'var(--ink)',
    lineHeight: 1.5,
  },
  strong: {
    fontWeight: 700,
  },
};

export default function TargetRoleCard({ targetRole, address, remoteFriendly, profileCompleteness, topGap }) {
  const locationParts = [address, remoteFriendly ? 'Remote friendly' : 'On-site'].filter(Boolean);
  const locationText = locationParts.length > 0 ? locationParts.join(' · ') : null;

  return (
    <div style={styles.card}>
      <div style={styles.eyebrow}>Target role</div>
      <h2 style={styles.roleName}>{targetRole}</h2>
      {locationText && <div style={styles.location}>{locationText}</div>}
      {profileCompleteness !== null && topGap && (
        <div style={styles.banner}>
          Your profile is <span style={styles.strong}>{profileCompleteness}% complete</span>.{' '}
          Add {topGap} evidence to improve job matching.
        </div>
      )}
    </div>
  );
}
