// File: api/merge.js
// Vercel Serverless Function (Node.js)
// Parses multipart/form-data with formidable, merges with pdf-lib, returns application/pdf

const formidable = require('formidable');
const fs = require('fs/promises');
const { PDFDocument } = require('pdf-lib');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function parseForm(req) {
  return await new Promise((resolve, reject) => {
    const form = formidable({ multiples: true, maxFileSize: 200 * 1024 * 1024 }); // 200MB
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      const list = Array.isArray(files?.files) ? files.files : (files?.files ? [files.files] : []);
      resolve({ fields, list });
    });
  });
}

module.exports = async (req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end('Method Not Allowed');
  }

  try {
    const { list } = await parseForm(req);
    if (!list.length) {
      res.statusCode = 400;
      return res.end('No files received under field name "files"');
    }

    const buffers = [];
    for (const f of list) {
      const buf = await fs.readFile(f.filepath);
      buffers.push(buf);
    }

    const out = await PDFDocument.create();
    for (const buf of buffers) {
      const src = await PDFDocument.load(buf);
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach(p => out.addPage(p));
    }

    const pdfBytes = await out.save();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="merged.pdf"');
    return res.end(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    return res.end('Merge failed');
  }
};
