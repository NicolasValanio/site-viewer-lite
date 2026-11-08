import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../backend/app.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(testDirectory, '../data');
const cloudPath = path.join(dataDirectory, 'clouds', '1201-30001.pts');
let createdCloudFixture = false;

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

async function ensureCloudFixture() {
  try {
    await fs.access(cloudPath);
    return;
  } catch {
    const cloud = Buffer.alloc(32);
    cloud.write('PTS1', 0, 'ascii');
    cloud.writeUInt32LE(1, 4);
    cloud.writeFloatLE(0.02, 8);
    cloud.writeUInt32LE(0, 12);
    cloud.writeFloatLE(1, 16);
    cloud.writeFloatLE(2, 20);
    cloud.writeFloatLE(3, 24);
    cloud.set([255, 128, 64, 255], 28);

    await fs.mkdir(path.dirname(cloudPath), { recursive: true });
    await fs.writeFile(cloudPath, cloud);
    createdCloudFixture = true;
  }
}

beforeAll(ensureCloudFixture);

afterAll(async () => {
  if (createdCloudFixture) {
    await fs.unlink(cloudPath);
  }
});

describe('authentication and authorization', () => {
  it('rejects missing and invalid bearer tokens', async () => {
    const missingToken = await request(app).get('/api/projects');
    const invalidToken = await request(app).get('/api/projects').set(bearer('unknown-token'));

    expect(missingToken.status).toBe(401);
    expect(invalidToken.status).toBe(401);
    expect(missingToken.body).toEqual(invalidToken.body);
  });

  it('only returns projects from the client account', async () => {
    const acme = await request(app).get('/api/projects').set(bearer('acme-token'));
    const brick = await request(app).get('/api/projects').set(bearer('brick-token'));

    expect(acme.status).toBe(200);
    expect(acme.body.projects).toHaveLength(2);
    expect(acme.body.projects.map((project) => project.id)).toEqual(['1201-30001', '1201-30002']);
    expect(brick.status).toBe(200);
    expect(brick.body.projects).toHaveLength(1);
    expect(brick.body.projects[0].id).toBe('0980-41007');
  });

  it('never serializes internal data and redacts client contacts', async () => {
    const staff = await request(app).get('/api/projects/1201-30001').set(bearer('staff-token'));
    const client = await request(app).get('/api/projects/1201-30001').set(bearer('acme-token'));

    expect(staff.status).toBe(200);
    expect(staff.body.project).not.toHaveProperty('internal');
    expect(staff.body.project.client.contacts[0]).toMatchObject({
      email: 'sam@acme.example',
      phone: '+1 510 555 0101'
    });
    expect(client.status).toBe(200);
    expect(client.body.project).not.toHaveProperty('internal');
    expect(client.body.project.client.contacts[0]).not.toHaveProperty('email');
    expect(client.body.project.client.contacts[0]).not.toHaveProperty('phone');
  });

  it('hides projects outside the client account exactly like missing projects', async () => {
    const hidden = await request(app).get('/api/projects/0980-41007').set(bearer('acme-token'));
    const missing = await request(app).get('/api/projects/9999-99999').set(bearer('acme-token'));

    expect(hidden.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(hidden.body).toEqual(missing.body);
  });
});

describe('input validation', () => {
  it('returns a client error for malformed project ids and JSON bodies', async () => {
    const invalidId = await request(app).get('/api/projects/not-an-id').set(bearer('acme-token'));
    const invalidJson = await request(app)
      .post('/api/projects/1201-30001/issues')
      .set(bearer('acme-token'))
      .set('Content-Type', 'application/json')
      .send('{');

    expect(invalidId.status).toBe(400);
    expect(invalidId.body.error.code).toBe('VALIDATION_ERROR');
    expect(invalidJson.status).toBe(400);
    expect(invalidJson.body.error.code).toBe('INVALID_JSON');
  });

  it.each([
    ['an empty title', { title: '  ', level: 'Level 1' }],
    ['a title longer than 120 characters', { title: 'a'.repeat(121), level: 'Level 1' }],
    ['an unknown level', { title: 'Broken light', level: 'Level 99' }],
    ['a space from another project', { title: 'Broken light', level: 'Level 1', spaceId: 'b1' }],
    ['an unexpected field', { title: 'Broken light', level: 'Level 1', priority: 'high' }]
  ])('rejects an issue with %s', async (_label, issue) => {
    const response = await request(app)
      .post('/api/projects/1201-30001/issues')
      .set(bearer('acme-token'))
      .send(issue);

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates an issue when title, level and project space are valid', async () => {
    const response = await request(app)
      .post('/api/projects/1201-30001/issues')
      .set(bearer('acme-token'))
      .send({ title: 'Loose handrail near lobby', level: 'Level 1', spaceId: 's1' });

    expect(response.status).toBe(201);
    expect(response.body.id).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

describe('HTTP caching and point cloud delivery', () => {
  it('revalidates project details with a private ETag', async () => {
    const firstResponse = await request(app).get('/api/projects/1201-30001').set(bearer('acme-token'));
    const etag = firstResponse.headers.etag;
    const revalidatedResponse = await request(app)
      .get('/api/projects/1201-30001')
      .set(bearer('acme-token'))
      .set('If-None-Match', etag);

    expect(firstResponse.status).toBe(200);
    expect(etag).toBeTruthy();
    expect(firstResponse.headers['cache-control']).toContain('private');
    expect(firstResponse.headers.vary).toMatch(/authorization/i);
    expect(revalidatedResponse.status).toBe(304);
    expect(revalidatedResponse.text).toBe('');
  });

  it('serves a requested byte range and rejects an unsatisfiable range', async () => {
    const partial = await request(app)
      .get('/api/projects/1201-30001/cloud')
      .set(bearer('acme-token'))
      .set('Range', 'bytes=0-15');
    const invalidRange = await request(app)
      .get('/api/projects/1201-30001/cloud')
      .set(bearer('acme-token'))
      .set('Range', 'bytes=999999999-1000000000');

    expect(partial.status).toBe(206);
    expect(partial.body).toHaveLength(16);
    expect(partial.headers['accept-ranges']).toBe('bytes');
    expect(partial.headers['content-range']).toMatch(/^bytes 0-15\/\d+$/);
    expect(invalidRange.status).toBe(416);
    expect(invalidRange.headers['content-range']).toMatch(/^bytes \*\/\d+$/);
  });

  it('returns 404 for a project without a point cloud', async () => {
    const response = await request(app).get('/api/projects/0980-41007/cloud').set(bearer('staff-token'));

    expect(response.status).toBe(404);
  });
});
