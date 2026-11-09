// Resume checks and preview parsing for RegisterPage.
// pdfjs and mammoth are pulled in only through `parseResumePreview`, via dynamic
// imports, so they stay out of every other route's bundle.

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const PARSE_TIMEOUT_MS = 10000;
export const PREVIEW_MAX_CHARS = 900;

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** 'pdf' | 'docx' | null, from MIME type or extension. */
export function resumeKind(file) {
  const name = (file?.name || '').toLowerCase();
  if (file?.type === PDF_MIME || name.endsWith('.pdf')) return 'pdf';
  if (file?.type === DOCX_MIME || name.endsWith('.docx')) return 'docx';
  return null;
}

/** Returns a rejection reason, or '' when the file is acceptable to try. */
export function validateResumeFile(file) {
  if (!resumeKind(file)) return 'Resume must be a PDF or DOCX file.';
  if (file.size > MAX_RESUME_BYTES) return 'Resume is larger than 5 MB. Choose a smaller PDF or DOCX file.';
  return '';
}

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Parses the resume in the browser and resolves with preview text.
 * Rejects with an Error whose message is a user-facing reason when the file is
 * unreadable, has no text, or parsing exceeds `timeoutMs` (default 10 s).
 */
export async function parseResumePreview(file, timeoutMs = PARSE_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Reading the resume took longer than 10 seconds. Try a smaller or simpler file.')),
      timeoutMs,
    );
  });
  const work = (async () => {
    const { extractResumeText } = await import('../utils/resumeText');
    const text = await extractResumeText(file);
    if (!text || !text.trim()) {
      throw new Error('No readable text was found in this resume. Scanned or image-only files cannot be previewed.');
    }
    return text.replace(/\s+/g, ' ').trim().slice(0, PREVIEW_MAX_CHARS);
  })().catch((err) => {
    if (err && err.message && /^(No readable|Reading the resume)/.test(err.message)) throw err;
    throw new Error('This resume could not be read. It may be corrupted or password protected.');
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
