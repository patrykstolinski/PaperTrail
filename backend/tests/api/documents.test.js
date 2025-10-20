import request from 'supertest';
import { describe, it } from 'mocha';
import assert from 'assert';

const baseUrl = 'http://localhost:4000';
const devUser = process.env.DEV_CURRENT_USER_ID || '650000000000000000000001';

describe('Documents API (multipart upload)', function() {
  this.timeout(15000);

  it('POST /api/documents should accept multipart file upload and set folderId', async () => {
    // create a folder first
  const uniqueName = 'uploadTestFolder-' + Date.now();
  const folderRes = await request(baseUrl).post('/api/folders').set('X-Dev-User-Id', devUser).send({ name: uniqueName });
    assert.strictEqual(folderRes.status, 201);
    const folderId = folderRes.body.data._id;

    const res = await request(baseUrl)
      .post('/api/documents')
      .set('X-Dev-User-Id', devUser)
      .field('title', 'upload-test-doc')
      .field('extractedFields', JSON.stringify({ foo: 'bar' }))
      .attach('file', 'backend/tests/DocumentUploadDownload/testBild.png')
      .field('folderId', folderId);

    assert.strictEqual(res.status, 201);

    // cleanup
    await request(baseUrl).delete(`/api/folders/${folderId}?force=true`).set('X-Dev-User-Id', devUser);
  });
});
