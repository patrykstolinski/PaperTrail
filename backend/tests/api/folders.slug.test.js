import request from 'supertest';
import { describe, it } from 'mocha';
import assert from 'assert';

const baseUrl = 'http://localhost:4000';
const devUser = process.env.DEV_CURRENT_USER_ID || '650000000000000000000001';

describe('Folders API (slug documents)', function() {
  this.timeout(20000);

  it('GET /api/folders/slug/:slug/documents should return documents in folder by slug', async () => {
    // create folder
    const uniqueName = 'slugTestFolder-' + Date.now();
    const create = await request(baseUrl).post('/api/folders').set('X-Dev-User-Id', devUser).send({ name: uniqueName });
    assert.strictEqual(create.status, 201);
    const folder = create.body.data;

    // upload a document into the folder
    const upload = await request(baseUrl)
      .post('/api/documents')
      .set('X-Dev-User-Id', devUser)
      .field('title', 'slug-test-doc')
      .field('extractedFields', JSON.stringify({ foo: 'bar' }))
      .field('folderId', folder._id)
      .attach('file', 'backend/tests/DocumentUploadDownload/testBild.png');
    assert.strictEqual(upload.status, 201);
    const docId = upload.body.id || upload.body.data?._id || upload.body.data?.id;

    // call the slug endpoint
    const res = await request(baseUrl).get(`/api/folders/slug/${folder.slug}/documents`).set('X-Dev-User-Id', devUser);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    const found = res.body.data.find(d => d._id === (docId || upload.body.data._id));
    assert.ok(found, 'uploaded document should be returned by slug endpoint');

    // cleanup
    await request(baseUrl).delete(`/api/folders/${folder._id}?force=true`).set('X-Dev-User-Id', devUser);
  });

});
