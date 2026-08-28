import { useEffect, useState } from 'react';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

const styles = {
  intro: {
    fontSize: 13,
    color: 'var(--muted)',
    lineHeight: 1.5,
    marginBottom: 14,
  },
  loading: {
    textAlign: 'center',
    padding: 24,
    color: 'var(--muted)',
    fontSize: 14,
  },
  empty: {
    textAlign: 'center',
    padding: 28,
    color: 'var(--muted)',
    fontSize: 14,
  },
  postList: {
    maxHeight: 320,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 16,
    paddingRight: 2,
  },
  post: {
    background: 'var(--bg, #fafafa)',
    border: '1px solid var(--line)',
    borderRadius: 12,
    padding: '12px 14px',
  },
  postOwn: {
    background: 'var(--teal-soft)',
    borderColor: 'transparent',
  },
  postHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  author: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--ink)',
  },
  ownBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--teal)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  timestamp: {
    fontSize: 11,
    color: 'var(--muted)',
    flexShrink: 0,
  },
  body: {
    fontSize: 14,
    color: 'var(--ink)',
    lineHeight: 1.55,
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  },
  composer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid var(--line)',
    borderRadius: 10,
    fontSize: 13,
    color: 'var(--ink)',
    resize: 'vertical',
    minHeight: 90,
    maxLength: 4000,
    fontFamily: 'inherit',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },
  postButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 18px',
    background: 'var(--teal)',
    color: 'var(--surface)',
    border: 0,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  postButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
  },
};

export default function DiscussionModal({ open, onClose, lessonId }) {
  const { showToast } = useToast();
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !lessonId) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setPosts([]);

    api.get(`/discussions/lessons/${lessonId}`, { signal: controller.signal })
      .then((data) => {
        setPosts(data?.posts || []);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError(err.message || 'Could not load discussion');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, lessonId]);

  const handlePost = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (!lessonId) return;
    if (trimmed.length > 4000) {
      setError('Post content must not exceed 4000 characters');
      return;
    }
    setPosting(true);
    setError('');
    try {
      const created = await api.post(`/discussions/lessons/${lessonId}/posts`, { content: trimmed });
      setPosts((prev) => [...prev, created]);
      setContent('');
      showToast('Posted to discussion', 'success');
    } catch (err) {
      setError(err.message || 'Failed to post');
      showToast(err.message || 'Failed to post', 'error');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Course community"
      title="Lesson discussion"
      footer={
        <div style={styles.composer}>
          {error && <div style={styles.errorText}>{error}</div>}
          <textarea
            style={styles.textarea}
            placeholder="Ask a question or share what you learned..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={4000}
            disabled={posting}
          />
          <div style={styles.actions}>
            <button
              style={{
                ...styles.postButton,
                ...(posting || !content.trim() ? styles.postButtonDisabled : {}),
              }}
              onClick={handlePost}
              disabled={posting || !content.trim()}
            >
              {posting ? <Loader2 size={14} /> : <Send size={14} />}
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      }
    >
      <div style={styles.intro}>
        Ask the learning community about this lesson and keep the conversation going.
      </div>

      {loading ? (
        <div style={styles.loading}>Loading discussion...</div>
      ) : posts.length === 0 ? (
        <div style={styles.empty}>
          <MessageCircle size={20} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
          No discussion yet. Be the first to ask a question.
        </div>
      ) : (
        <div style={styles.postList}>
          {posts.map((post) => (
            <div key={post.postId} style={{ ...styles.post, ...(post.isOwn ? styles.postOwn : {}) }}>
              <div style={styles.postHeader}>
                <div style={styles.author}>
                  {post.authorName || 'Anonymous'}
                  {post.isOwn && <span style={styles.ownBadge}>You</span>}
                </div>
                {post.createdAt && (
                  <div style={styles.timestamp}>{new Date(post.createdAt).toLocaleString()}</div>
                )}
              </div>
              <div style={styles.body}>{post.content}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}