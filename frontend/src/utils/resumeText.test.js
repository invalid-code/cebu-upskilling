import { describe, it, expect, vi } from 'vitest';
import { extractResumeText } from './resumeText';

const m = vi.hoisted(() => ({
  pdfItems: vi.fn(() => [{ str: 'PDF page text' }]),
  extractRawText: vi.fn(async () => ({ value: 'DOCX extracted text' })),
}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({ items: m.pdfItems() }),
      }),
    }),
  }),
}));

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'mock-worker-url' }));

vi.mock('mammoth', () => ({
  default: { extractRawText: m.extractRawText },
}));

const txtFile = (name = 'resume.txt') => ({
  name,
  type: '',
  text: async () => '  Hello from a plain resume.  ',
});

describe('extractResumeText', () => {
  it('extracts text from a .txt file based on the file name', async () => {
    await expect(extractResumeText(txtFile('resume.txt'))).resolves.toBe(
      'Hello from a plain resume.',
    );
  });

  it('extracts text from a .md file', async () => {
    await expect(extractResumeText(txtFile('notes.md'))).resolves.toBe(
      'Hello from a plain resume.',
    );
  });

  it('extracts text from a file using the mime type', async () => {
    const file = { ...txtFile('resume'), type: 'text/plain' };
    await expect(extractResumeText(file)).resolves.toBe('Hello from a plain resume.');
  });

  it('extracts text from a .pdf file via pdfjs', async () => {
    const file = { name: 'resume.PDF', type: 'application/pdf', arrayBuffer: async () => new ArrayBuffer(0) };
    await expect(extractResumeText(file)).resolves.toBe('PDF page text');
  });

  it('falls back to pdfjs for a .pdf file even without a mime type', async () => {
    const file = { name: 'cv.pdf', type: '', arrayBuffer: async () => new ArrayBuffer(0) };
    await expect(extractResumeText(file)).resolves.toBe('PDF page text');
  });

  it('extracts text from a .docx file via mammoth', async () => {
    const file = {
      name: 'resume.docx',
      type: '',
      arrayBuffer: async () => new ArrayBuffer(0),
    };
    await expect(extractResumeText(file)).resolves.toBe('DOCX extracted text');
  });

  it('extracts text from a docx mimetype without a matching extension', async () => {
    const file = {
      name: 'resume',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      arrayBuffer: async () => new ArrayBuffer(0),
    };
    await expect(extractResumeText(file)).resolves.toBe('DOCX extracted text');
  });

  it('rejects unsupported resume formats', async () => {
    const file = { ...txtFile('resume.weird'), type: '' };
    await expect(extractResumeText(file)).rejects.toThrow('Unsupported resume format');
  });
});