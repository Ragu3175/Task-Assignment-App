/**
 * API tests for Task-Assignment backend.
 * Uses TEST_DATABASE from .env for test data (see seedTest.js).
 *
 * IMPORTANT: Backend must be running on port 5000 before running tests.
 *
 * 1. Seed test DB (optional): npm run seed:test
 * 2. Start server: npm start
 *    (Or with test DB: set CONNECTION_STRING=%TEST_DATABASE% && npm start  on Windows)
 * 3. Run tests: npm run test
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { describe, it } = require('node:test');
const assert = require('node:assert');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';

async function request(method, path, body = null, token = null) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      throw new Error(
        `Backend not running at ${BASE_URL}. Start it first: npm start (or set CONNECTION_STRING to TEST_DATABASE for test DB).`
      );
    }
    throw err;
  }
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: res.status, data };
}

describe('Root', () => {
  it('GET / returns app running message', async () => {
    const { status, data } = await request('GET', '/');
    assert.strictEqual(status, 200);
    assert.ok(data && data.includes && data.includes('running'));
  });
});

describe('Signup API', () => {
  const unique = `user${Date.now()}@test.com`;

  it('POST /api/signup creates user with 201', async () => {
    const { status, data } = await request('POST', '/api/signup', {
      username: 'TestUser',
      email: unique,
      password: 'TestPass123',
    });
    assert.strictEqual(status, 201);
    assert.ok(data && data.message && data.message.toLowerCase().includes('created'));
  });

  it('POST /api/signup returns 409 when email already exists', async () => {
    const { status, data } = await request('POST', '/api/signup', {
      username: 'Other',
      email: unique,
      password: 'OtherPass',
    });
    assert.strictEqual(status, 409);
    assert.ok(data && data.message && data.message.toLowerCase().includes('already'));
  });

  it('POST /api/signup/login returns 404 when email does not exist', async () => {
    const { status, data } = await request('POST', '/api/signup/login', {
      email: 'nonexistent@test.com',
      password: 'any',
    });
    assert.strictEqual(status, 404);
    assert.ok(data && data.message && data.message.toLowerCase().includes('not exist'));
  });

  it('POST /api/signup/login returns 403 when password is wrong', async () => {
    const { status, data } = await request('POST', '/api/signup/login', {
      email: unique,
      password: 'WrongPassword',
    });
    assert.strictEqual(status, 403);
    assert.ok(data && data.message && data.message.toLowerCase().includes('incorrect'));
  });

  it('POST /api/signup/login returns 201 and accessToken for valid credentials', async () => {
    const { status, data } = await request('POST', '/api/signup/login', {
      email: unique,
      password: 'TestPass123',
    });
    assert.strictEqual(status, 201);
    assert.ok(data && data.accessToken);
    assert.ok(data.message && data.message.toLowerCase().includes('login'));
  });
});

describe('Groups API (protected)', () => {
  let token;
  let groupId;
  const unique = `groupuser${Date.now()}@test.com`;

  it('POST /api/signup and login to get token', async () => {
    await request('POST', '/api/signup', {
      username: 'GroupTestUser',
      email: unique,
      password: 'GroupPass123',
    });
    const { status, data } = await request('POST', '/api/signup/login', {
      email: unique,
      password: 'GroupPass123',
    });
    assert.strictEqual(status, 201);
    assert.ok(data && data.accessToken);
    token = data.accessToken;
  });

  it('GET /api/groups returns 403 without token', async () => {
    const { status, data } = await request('GET', '/api/groups');
    assert.strictEqual(status, 403);
    assert.ok(data && (data.message === 'token is invalid' || data.message === 'unauthorized access'));
  });

  it('POST /api/groups returns 403 without token', async () => {
    const { status } = await request('POST', '/api/groups', { groupname: 'MyGroup' });
    assert.strictEqual(status, 403);
  });

  it('POST /api/groups creates group with valid token', async () => {
    const { status, data } = await request(
      'POST',
      '/api/groups',
      { groupname: `TestGroup${Date.now()}` },
      token
    );
    assert.strictEqual(status, 201);
    assert.ok(data && data.group && data.group._id);
    groupId = data.group._id;
  });

  it('GET /api/groups returns 200 and groups array with valid token', async () => {
    const { status, data } = await request('GET', '/api/groups', null, token);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.groups));
    assert.ok(data.message && data.message.toLowerCase().includes('fetch'));
  });

  it('GET /api/groups/:groupId returns 200 and members with valid token', async () => {
    if (!groupId) return;
    const { status, data } = await request('GET', `/api/groups/${groupId}`, null, token);
    assert.strictEqual(status, 200);
    assert.ok(data && Array.isArray(data.members));
  });

  it('GET /api/groups/:groupId returns 404 for invalid group id', async () => {
    const { status, data } = await request(
      'GET',
      '/api/groups/000000000000000000000000',
      null,
      token
    );
    assert.strictEqual(status, 404);
    assert.ok(data && data.message && data.message.toLowerCase().includes('find'));
  });

  it('POST /api/groups/addmembers returns 404 for non-existent group', async () => {
    const { status, data } = await request(
      'POST',
      '/api/groups/addmembers',
      { groupId: '000000000000000000000000', memberEmail: 'someone@test.com' },
      token
    );
    assert.strictEqual(status, 404);
    assert.ok(data && data.message && data.message.toLowerCase().includes('find'));
  });

  it('POST /api/groups/addmembers returns 404 when user not in DB', async () => {
    if (!groupId) return;
    const { status, data } = await request(
      'POST',
      '/api/groups/addmembers',
      { groupId: String(groupId), memberEmail: 'notindb@test.com' },
      token
    );
    assert.strictEqual(status, 404);
    assert.ok(data && data.message && (data.message.includes('user') || data.message.includes('find')));
  });

  it('DELETE /api/groups/:groupId returns 200 with valid token (admin)', async () => {
    if (!groupId) return;
    const { status, data } = await request('DELETE', `/api/groups/${groupId}`, null, token);
    assert.strictEqual(status, 200);
    assert.ok(data && data.message && data.message.toLowerCase().includes('deleted'));
  });
});

