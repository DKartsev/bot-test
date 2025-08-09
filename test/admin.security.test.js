const request = require('supertest');
const { buildApp } = require('./helpers/testServer');

describe('admin security', () => {
  test('unauthorized access', async () => {
    const app = buildApp();
    await request(app).get('/admin/qa').expect(401);
  });

  test('editor permissions', async () => {
    const app = buildApp();
    await request(app)
      .get('/admin/qa')
      .set('Authorization', 'Bearer test-editor')
      .expect(200);
    await request(app)
      .get('/admin/qa/pending')
      .set('Authorization', 'Bearer test-editor')
      .expect(200);
    await request(app)
      .delete('/admin/qa/1')
      .set('Authorization', 'Bearer test-editor')
      .expect(401);
  });

  test('admin permissions', async () => {
    const app = buildApp();
    await request(app)
      .get('/admin/qa/export')
      .set('Authorization', 'Bearer test-admin')
      .expect(200);
    await request(app)
      .delete('/admin/qa/1')
      .set('Authorization', 'Bearer test-admin')
      .expect(200);
  });
});
