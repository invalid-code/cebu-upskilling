import { blocksToMarkdown } from '../../lib/markdown';

/** The four Course Studio creation steps, in order. */
export const STUDIO_STEPS = ['Basics', 'Outline', 'Lessons', 'Publish'];

export const VIDEO_LIMIT_MESSAGE = 'Video must be 500 MB or smaller';
export const DOCUMENT_LIMIT_MESSAGE = 'File must be 10 MB or smaller';
export const AI_UNAVAILABLE_MESSAGE = 'Suggestions are unavailable right now';

export const emptyCourse = () => ({
  name: '',
  description: '',
  technicalLevel: 1,
  mode: 'Online',
  price: '',
  issuesCertificate: false,
  modules: [],
});

export const isPublished = (course) => String(course?.status).toLowerCase() === 'published';

/** Splits the course list into Draft and Published groups (anything not published is a draft). */
export function groupCourses(courses) {
  const list = Array.isArray(courses) ? courses : [];
  return {
    draft: list.filter((c) => !isPublished(c)),
    published: list.filter(isPublished),
  };
}

// Lesson content is authored as a single Markdown document. Lessons loaded
// from the server still carry legacy typed blocks; they are converted to
// equivalent Markdown on first read and saved back as one markdown block.
export function markdownOfLesson(lesson) {
  if (!lesson) return '';
  if (typeof lesson.markdown === 'string') return lesson.markdown;
  return blocksToMarkdown(lesson.contents);
}

/** Builds the API payload for create/update from the editor state. */
export function buildCoursePayload(course) {
  return {
    ...course,
    price: course.price === '' || course.price == null ? null : Number(course.price),
    modules: course.modules.map((m, i) => ({
      ...m,
      order: i,
      lessons: (m.lessons || []).map((l, j) => {
        const md = markdownOfLesson(l).trim();
        return { ...l, order: j, contents: md ? [{ blockType: 'markdown', content: md }] : [] };
      }),
    })),
  };
}

/** Normalises a course loaded from the server so the editor can rely on arrays existing. */
export function normalizeLoadedCourse(course) {
  const base = { ...emptyCourse(), ...(course || {}) };
  base.modules = (base.modules || []).map((m) => ({ ...m, lessons: m.lessons || [] }));
  return base;
}

/** Converts an AI draft response into editor state, keeping the current price. */
export function courseFromAiDraft(draft, currentPrice) {
  return {
    name: draft.name || '',
    description: draft.description || '',
    technicalLevel: draft.technicalLevel || 1,
    mode: draft.mode || 'Online',
    price: currentPrice || '',
    issuesCertificate: false,
    modules: (draft.modules || []).map((m, i) => ({
      name: m.name || '',
      description: m.description || '',
      order: i,
      lessons: (m.lessons || []).map((l, j) => ({
        name: l.name || '',
        description: l.description || '',
        order: j,
        markdown: markdownOfLesson(l),
        contents: [],
      })),
    })),
  };
}

/** True when an error is the AI service being down (HTTP 502/503). */
export const isAiUnavailable = (err) => err?.status === 502 || err?.status === 503;

// Mirrors MediaService limits so bad files are rejected before upload.
const ATTACH_DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp'];

export function validateVideoFile(file) {
  if (!(file.type || '').toLowerCase().startsWith('video/')) return 'Only video files are allowed';
  if (file.size > 500 * 1024 * 1024) return VIDEO_LIMIT_MESSAGE;
  return null;
}

export function validateAttachDocument(file) {
  const dot = file.name ? file.name.lastIndexOf('.') : -1;
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!ATTACH_DOC_EXTENSIONS.includes(ext)) return 'Unsupported file type';
  if (file.size > 10 * 1024 * 1024) return DOCUMENT_LIMIT_MESSAGE;
  return null;
}
