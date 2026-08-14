async function extractPdfText(file) {
  const pdfjsLib = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(' '));
  }
  return pages.join('\n').trim();
}

async function extractDocxText(file) {
  const mammoth = (await import('mammoth')).default;
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value.trim();
}

async function extractPlainText(file) {
  return (await file.text()).trim();
}

export async function extractResumeText(file) {
  const name = (file.name || '').toLowerCase();
  const type = file.type || '';

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractPdfText(file);
  }
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return extractDocxText(file);
  }
  if (name.endsWith('.txt') || name.endsWith('.md') || type.startsWith('text/')) {
    return extractPlainText(file);
  }
  throw new Error('Unsupported resume format');
}
