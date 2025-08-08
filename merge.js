// File: api/merge.mjs
// Vercel Serverless Function (ESM)
// Parses multipart/form-data with formidable, merges PDFs and images with pdf-lib,
// respects per-file options delivered as JSON under field name "options" and a global
// page limit under field name "limit". Returns the merged PDF with X-Merged-Pages.
//
// Expected multipart fields
//  - files: one or more files (PDF, PNG, JPG/JPEG, WebP*)
//  - limit: optional, number (total pages cap)
//  - options: optional, JSON array with entries parallel to the incoming files order
//      [{ name, kind: 'pdf'|'image', range: '1-3,6,9-', rotate: 0|90|180|270, reverse: boolean }]
// * WebP requires optional dependency `sharp` to transcode → JPEG.

import formidable from 'formidable';
import fs from 'fs/promises';
import { PDFDocument, degrees } from 'pdf-lib';

// Optional sharp (for WebP → JPEG)
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { /* optional */ }

function getField(fields, key, def = undefined) {
  const v = fields?.[key];
  if (Array.isArray(v)) return v[0];
  return v ?? def;
}

function setCors(res) {
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

// Parse ranges like "1-3,6,9-" to zero-based indices
function parsePageRange(rangeStr, pageCount) {
  if (!rangeStr) return null;
  const out = new Set();
  const parts = String(rangeStr).split(',').map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const i = clamp(parseInt(part, 10) - 1, 0, pageCount - 1); out.add(i);
    } else {
      const m = part.match(/^(\d+)?\s*-\s*(\d+)?$/);
      if (m) {
        const start = m[1] ? clamp(parseInt(m[1], 10) - 1, 0, pageCount - 1) : 0;
        const end = m[2] ? clamp(parseInt(m[2], 10) - 1, 0, pageCount - 1) : pageCount - 1;
        for (let i = start; i <= end; i++) out.add(i);
      }
    }
  }
  return Array.from(out).sort((a, b) => a - b);
}
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    const { fields, list } = await parseForm(req);
    if (!list.length) return res.status(400).end('No files received under field name "files"');

    const rawLimit = getField(fields, 'limit');
    let remaining = parseInt(rawLimit, 10);
    if (!Number.isFinite(remaining) || remaining <= 0) remaining = Infinity;

    let options = [];
    const rawOptions = getField(fields, 'options');
    if (rawOptions) {
      try { options = JSON.parse(Array.isArray(rawOptions) ? rawOptions[0] : rawOptions) || []; }
      catch { /* ignore bad options */ }
    }

    // Keep incoming order stable; zip options by index (fallback by name)
    const out = await PDFDocument.create();
    let merged = 0;

    for (let idx = 0; idx < list.length && remaining > 0; idx++) {
      const f = list[idx];
      const opt = options[idx] || options.find(o => o?.name === f.originalFilename) || {};
      const mimetype = (f.mimetype || '').toLowerCase();
      const isPDF = mimetype === 'application/pdf' || /\.pdf$/i.test(f.originalFilename || '');

      const buf = await fs.readFile(f.filepath);

      if (isPDF) {
        const src = await PDFDocument.load(buf);
        const pageIndices = src.getPageIndices();
        const wanted = parsePageRange(opt.range, pageIndices.length) || pageIndices;
        const seq = opt.reverse ? [...wanted].reverse() : wanted;
        const slice = seq.slice(0, Math.min(seq.length, remaining));
        const pages = await out.copyPages(src, slice);
        for (const p of pages) {
          if (opt.rotate) p.setRotation(degrees(Number(opt.rotate) || 0));
          out.addPage(p);
        }
        merged += pages.length;
        remaining -= pages.length;
      } else if (/^image\//.test(mimetype) || /\.(png|jpe?g|webp)$/i.test(f.originalFilename || '')) {
        // image → single page
        let imgBytes = buf;
        let kind = 'jpg';
        if (mimetype.includes('png') || /\.png$/i.test(f.originalFilename || '')) kind = 'png';
        else if (mimetype.includes('webp') || /\.webp$/i.test(f.originalFilename || '')) kind = 'webp';

        if (kind === 'webp') {
          if (!sharp) return res.status(415).end('WebP requires optional dependency "sharp" on the server');
          imgBytes = await sharp(imgBytes).jpeg({ quality: 90 }).toBuffer();
          kind = 'jpg';
        }

        const img = kind === 'png' ? await out.embedPng(imgBytes) : await out.embedJpg(imgBytes);
        // Keep original pixel size but cap extreme sizes to avoid huge pages
        const maxW = 2000, maxH = 2600;
        let w = img.width, h = img.height;
        const scale = Math.min(1, Math.min(maxW / w, maxH / h));
        w = Math.floor(w * scale); h = Math.floor(h * scale);
        const page = out.addPage([w, h]);
        if (opt.rotate) page.setRotation(degrees(Number(opt.rotate) || 0));
        page.drawImage(img, { x: 0, y: 0, width: w, height: h });
        merged += 1;
        remaining -= 1;
      } else {
        // Unsupported kind — skip
        continue;
      }
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
}
