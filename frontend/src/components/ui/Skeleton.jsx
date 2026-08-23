const styles = {
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
};

/**
 * A single animated shimmer block. Size it with the height/width props or a style override.
 */
export default function Skeleton({ height = 12, width = '100%', radius = 6, style }) {
  return (
    <div
      className="skeleton"
      aria-hidden="true"
      style={{ height, width, borderRadius: radius, ...style }}
    />
  );
}

/**
 * A stack of text-like placeholder lines. The last line renders shorter by default.
 */
export function SkeletonText({ lines = 3, lineHeight = 12, gap = 8, lastWidth = '60%', style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={lineHeight} width={i === lines - 1 ? lastWidth : '100%'} />
      ))}
    </div>
  );
}

/**
 * Card-shaped placeholder that mirrors the JobCard/CourseCard geometry
 * (bordered surface, tag pill, title and meta lines).
 */
export function SkeletonCard({ minHeight = 220, radius = 15, style }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: radius,
        padding: 17,
        display: 'flex',
        flexDirection: 'column',
        minHeight,
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton height={22} width={72} radius={11} />
        <Skeleton height={22} width={22} radius={11} />
      </div>
      <Skeleton height={16} width="70%" style={{ marginTop: 14 }} />
      <Skeleton height={12} width="45%" style={{ marginTop: 8 }} />
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 14,
          borderTop: '1px solid var(--line)',
          display: 'flex',
          gap: 10,
        }}
      >
        <Skeleton height={11} width={90} />
        <Skeleton height={11} width={60} />
      </div>
    </div>
  );
}

/**
 * Placeholder for a StatCard (large value over a small label, bottom rule).
 */
export function SkeletonStat() {
  return (
    <div style={{ borderBottom: '1px solid var(--line)', padding: '0 0 15px' }}>
      <Skeleton height={30} width={56} style={{ marginBottom: 6 }} />
      <Skeleton height={12} width={120} />
    </div>
  );
}

/**
 * Accessible wrapper around one or more skeletons. Announces the loading label to
 * screen readers via role="status"/aria-busy while keeping it visually hidden.
 */
export function SkeletonStatus({ label, children, style }) {
  return (
    <div role="status" aria-busy="true" style={style}>
      <span style={styles.srOnly}>{label}</span>
      {children}
    </div>
  );
}
