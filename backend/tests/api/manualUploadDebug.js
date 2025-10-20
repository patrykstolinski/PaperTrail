import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

const BASE = 'http://localhost:4000';
const DEV_USER = process.env.DEV_CURRENT_USER_ID || '650000000000000000000001';

async function run() {
  try {
    // create folder
    const folderRes = await fetch(`${BASE}/api/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dev-User-Id': DEV_USER },
      body: JSON.stringify({ name: 'manualUploadDebug' })
    });
    const folderBody = await folderRes.json();
    console.log('create folder status', folderRes.status, folderBody);
    const folderId = folderBody.data && folderBody.data._id;

    // prepare form
    const form = new FormData();
    form.append('title', 'manual-upload-test');
    form.append('extractedFields', JSON.stringify({foo:'bar'}));
    form.append('folderId', folderId);
    form.append('file', fs.createReadStream('backend/tests/DocumentUploadDownload/testBild.png'));

    // upload
    const uploadRes = await fetch(`${BASE}/api/documents`, {
      method: 'POST',
      headers: { 'X-Dev-User-Id': DEV_USER, ...form.getHeaders() },
      body: form
    });
    const uploadText = await uploadRes.text();
    let uploadBody;
    try { uploadBody = JSON.parse(uploadText); } catch (e) { uploadBody = uploadText; }
    console.log('upload status', uploadRes.status, uploadBody);

  } catch (err) {
    console.error('manual debug error', err);
  }
}

run();
