import { Play, Pause, SkipForward, SkipBack, Maximize, Volume2 } from 'lucide-react';
import { useState } from 'react';

const styles = {
  container: {
    background: '#1a2e27',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  videoArea: {
    position: 'relative',
    aspectRatio: '16/9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a2e27 0%, #2d4a3f 100%)',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    border: '3px solid rgba(255,255,255,0.9)',
    color: 'white',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s, background 0.2s',
  },
  lessonInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '24px 20px 16px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
    color: 'white',
  },
  lessonLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    opacity: 0.8,
    marginBottom: 4,
  },
  lessonTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 4,
  },
  lessonMeta: {
    fontSize: 13,
    opacity: 0.8,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: 'var(--surface)',
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'transparent',
    border: 0,
    color: 'var(--muted)',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  },
  controlButtonPrimary: {
    width: 36,
    height: 36,
    background: 'var(--teal)',
    color: 'var(--surface)',
  },
  timeDisplay: {
    fontSize: 12,
    color: 'var(--muted)',
    fontFamily: 'monospace',
    minWidth: 80,
  },
  progressContainer: {
    flex: 1,
    height: 4,
    background: 'var(--line)',
    borderRadius: 2,
    position: 'relative',
    cursor: 'pointer',
  },
  progressBar: {
    height: '100%',
    background: 'var(--coral)',
    borderRadius: 2,
    transition: 'width 0.1s',
  },
  progressThumb: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: 'var(--coral)',
    border: '2px solid white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  rightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
};

export default function VideoPlayer({ lesson, totalLessons, currentIndex }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(258);
  const [duration] = useState(1334);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = (currentTime / duration) * 100;

  return (
    <div style={styles.container}>
      <div style={styles.videoArea}>
        <button
          style={styles.playButton}
          onClick={() => setIsPlaying(!isPlaying)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          {isPlaying ? <Pause size={32} /> : <Play size={32} style={{ marginLeft: 4 }} />}
        </button>

        <div style={styles.lessonInfo}>
          <div style={styles.lessonLabel}>
            Lesson {currentIndex + 1} of {totalLessons}
          </div>
          <div style={styles.lessonTitle}>{lesson?.name}</div>
          <div style={styles.lessonMeta}>
            {lesson?.durationMinutes || 22} min · Watch at your own pace
          </div>
        </div>
      </div>

      <div style={styles.controls}>
        <span style={styles.timeDisplay}>{formatTime(currentTime)}</span>

        <div
          style={styles.progressContainer}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            setCurrentTime(Math.floor(percent * duration));
          }}
        >
          <div style={{ ...styles.progressBar, width: `${progressPercent}%` }} />
          <div style={{ ...styles.progressThumb, left: `${progressPercent}%` }} />
        </div>

        <span style={styles.timeDisplay}>{formatTime(duration)}</span>

        <div style={styles.rightControls}>
          <button style={styles.controlButton}>
            <SkipBack size={16} />
          </button>
          <button style={styles.controlButton}>
            <SkipForward size={16} />
          </button>
          <button style={styles.controlButton}>
            <Volume2 size={16} />
          </button>
          <button style={styles.controlButton}>
            <Maximize size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
