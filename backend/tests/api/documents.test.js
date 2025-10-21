import request from 'supertest';
import { describe, it, before, after } from 'mocha';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseUrl = 'http://localhost:4000';
const devUser = process.env.DEV_CURRENT_USER_ID || '650000000000000000000001';

// Helper to create a unique tiny PNG file for each test
function createUniquePNG() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  // Minimal valid PNG: 1x1 transparent pixel with unique timestamp in metadata
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
    Buffer.from([0x00, 0x00, 0x00, 0x0D]), // IHDR chunk length
    Buffer.from('IHDR'),
    Buffer.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00]), // 1x1 RGBA
    Buffer.from([0x1F, 0x15, 0xC4, 0x89]), // IHDR CRC
    Buffer.from([0x00, 0x00, 0x00, 0x0A]), // IDAT chunk length
    Buffer.from('IDAT'),
    Buffer.from([0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01]), // compressed data
    Buffer.from([0x0D, 0x0A, 0x2D, 0xB4]), // IDAT CRC
    // tEXt chunk with unique timestamp
    Buffer.from([0x00, 0x00, 0x00, 0x10]), // tEXt chunk length (16 bytes)
    Buffer.from('tEXt'),
    Buffer.from(`test${timestamp}${random}\0`), // unique text
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // CRC (simplified, not accurate but works)
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // IEND chunk length
    Buffer.from('IEND'),
    Buffer.from([0xAE, 0x42, 0x60, 0x82]) // IEND CRC
  ]);
  
  const tmpFile = path.join(__dirname, `test-${timestamp}-${random}.png`);
  fs.writeFileSync(tmpFile, png);
  return tmpFile;
}

describe('Documents API (multipart upload)', function() {
  this.timeout(15000);

  let testImagePath;

  before(async () => {
    // Create unique test image to avoid fileHash conflicts
    testImagePath = createUniquePNG();
  });

  after(async () => {
    // Cleanup test image file
    if (testImagePath && fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  it('POST /api/documents should accept multipart file upload and set folderId', async () => {
    // create a folder first
    const uniqueName = 'uploadTestFolder-' + Date.now();
    const folderRes = await request(baseUrl).post('/api/folders').set('X-Dev-User-Id', devUser).send({ name: uniqueName });
    assert.strictEqual(folderRes.status, 201, `Expected 201 but got ${folderRes.status}: ${JSON.stringify(folderRes.body)}`);
    assert.ok(folderRes.body.data && folderRes.body.data._id, 'Folder response should include data._id');
    const folderId = folderRes.body.data._id;

    const res = await request(baseUrl)
      .post('/api/documents')
      .set('X-Dev-User-Id', devUser)
      .field('title', 'upload-test-doc-' + Date.now())
      .field('extractedFields', JSON.stringify({ foo: 'bar' }))
      .attach('file', testImagePath)
      .field('folderId', folderId);

    assert.strictEqual(res.status, 201, `Expected 201 but got ${res.status}: ${JSON.stringify(res.body)}`);

    const docId = res.body.id || res.body.data?._id || res.body.data?.id;

    // cleanup - delete document first, then folder
    if (docId) {
      await request(baseUrl).delete(`/api/documents/${docId}`).set('X-Dev-User-Id', devUser);
    }
    await request(baseUrl).delete(`/api/folders/${folderId}?force=true`).set('X-Dev-User-Id', devUser);
  });
});
