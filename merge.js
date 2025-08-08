// File: api/merge.js
// Vercel Serverless Function (Node.js)
// Parses multipart/form-data with formidable, merges with pdf-lib,
// supports an optional page limit via form field "limit" (number)

const formidable = require('formidable');
const fs = require('fs/promises');
const { PDFDocument } = require('pdf-lib');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Expose-Headers', 'X-Merged-Pages');
}

async function parseForm(req) {
  return await new Promise((resolve, reject) => {
    const form = formidable({ multiples: true, maxFileSize: 200 * 1024 * 1024 });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      const list = Array.isArray(files?.files) ? files.files : (files?.files ? [files.files] : []);
      resolve({ fields, list });
    });
  });
}

module.exports = async (req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    const { fields, list } = await parseForm(req);
    if (!list.length) return res.status(400).end('No files received under field name "files"');

    const rawLimit = Array.isArray(fields?.limit) ? fields.limit[0] : fields?.limit;
    let remaining = parseInt(rawLimit, 10);
    if (!Number.isFinite(remaining) || remaining <= 0) remaining = Infinity;

    const out = await PDFDocument.create();
    let merged = 0;

    for (const f of list) {
      if (remaining <= 0) break;
      const buf = await fs.readFile(f.filepath);
      const src = await PDFDocument.load(buf);
      const indices = src.getPageIndices();
      const slice = indices.slice(0, Math.min(indices.length, remaining));
      const pages = await out.copyPages(src, slice);
      pages.forEach(p => out.addPage(p));
      merged += pages.length;
      remaining -= pages.length;
    }

    const pdfBytes = await out.save();

    res.status(200)
      .setHeader('Content-Type', 'application/pdf')
      .setHeader('Content-Disposition', 'attachment; filename="merged.pdf"')
      .setHeader('X-Merged-Pages', String(merged))
      .end(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.status(500).end('Merge failed');
  }
};
