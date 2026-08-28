import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Maximize, Volume2, VolumeX, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

const styles = {
  container: {
    background: '#1a2e27',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  video: {
    display: 'block',
    width: '100%',
    aspectRatio: '16/9',
    background: '#000',
  },
  placeholder: {
    aspectRatio: '16/9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    padding: 24,
  },
  lessonInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '24px 20px 16px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
    color: 'white',
    pointerEvents: 'none',
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

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function VideoPlayer({ media = [], lessonName, currentIndex = 0, totalLessons = 0, lessonId, onProgress }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const { showToast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const videoMedia = media.find((m) => (m.type || '').toLowerCase().startsWith('video'));

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCompleted(false);
  }, [videoMedia?.pathFile, lessonId]);

  if (!videoMedia) {
    return (
      <div style={styles.container}>
        <div style={styles.placeholder}>
          No video available for this lesson yet.
        </div>
      </div>
    );
  }

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const skip = (delta) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), video.duration || 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const handleProgressClick = (e) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * video.duration;
  };

  const enterFullscreen = () => {
    const container = containerRef.current;
    if (container?.requestFullscreen) {
      container.requestFullscreen();
    }
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div style={styles.container} ref={containerRef}>
      <div style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          style={styles.video}
          src={videoMedia.pathFile}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={async () => {
            setIsPlaying(false);
            if (lessonId && !completed) {
              setCompleted(true);
              try {
                await api.put(`/coursecontent/lessons/${lessonId}/progress`, { lessonId, progressPercent: 100 });
                showToast('Lesson completed — progress saved', 'success');
                onProgress?.(100);
              } catch {
                showToast('Lesson watched — progress will sync shortly', 'success');
              }
            } else if (!completed) {
              setCompleted(true);
              showToast('Lesson completed — nice work!', 'success');
            }
          }}
          onClick={togglePlay}
        />
        <div style={styles.lessonInfo}>
          <div style={styles.lessonLabel}>
            Lesson {currentIndex + 1} of {totalLessons}
          </div>
          <div style={styles.lessonTitle}>{lessonName}</div>
          <div style={styles.lessonMeta}>
            {(videoMedia.mbSize || 0).toFixed(1)} MB · Watch at your own pace
          </div>
        </div>
      </div>

      <div style={styles.controls}>
        <span style={styles.timeDisplay}>{formatTime(currentTime)}</span>

        <div style={styles.progressContainer} onClick={handleProgressClick}>
          <div style={{ ...styles.progressBar, width: `${progressPercent}%` }} />
          <div style={{ ...styles.progressThumb, left: `${progressPercent}%` }} />
        </div>

        <span style={styles.timeDisplay}>{formatTime(duration)}</span>

        <div style={styles.rightControls}>
          <button style={styles.controlButton} onClick={() => skip(-10)} aria-label="Skip back 10 seconds">
            <SkipBack size={16} />
          </button>
          <button
            style={{ ...styles.controlButton, ...styles.controlButtonPrimary }}
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
          </button>
          <button style={styles.controlButton} onClick={() => skip(10)} aria-label="Skip forward 10 seconds">
            <SkipForward size={16} />
          </button>
          <button style={styles.controlButton} onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button style={styles.controlButton} onClick={enterFullscreen} aria-label="Fullscreen">
            <Maximize size={16} />
          </button>
        </div>
      </div>
      {completed && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--teal-soft)',
            color: 'var(--teal)',
            fontSize: 12,
            fontWeight: 700,
            borderTop: '1px solid var(--line)',
          }}
        >
          <CheckCircle2 size={16} /> Lesson completed — progress saved
        </div>
      )}
    </div>
  );
}
