const request = require('supertest');
const createApp = require('./app');
const User = require('../models/User');

let app;

beforeAll(() => {
  app = createApp();
});

describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toHaveProperty('_id');
    expect(res.body.user.name).toBe('Test User');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.role).toBe('user');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('should register a driver with vehicle details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Driver',
        email: 'driver@example.com',
        password: 'password123',
        role: 'driver',
        vehicle_details: {
          plate_number: 'DHA-1234',
          vehicle_type: 'basic',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('driver');
  });

  it('should reject duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User 1',
        email: 'dup@example.com',
        password: 'password123',
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User 2',
        email: 'dup@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(409);
  });

  it('should reject admin role on registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Hacker',
        email: 'hacker@example.com',
        password: 'password123',
        role: 'admin',
      });

    // Zod should reject 'admin' as a role option, returning 400
    expect(res.status).toBe(400);
  });

  it('should reject moderator role on registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Hacker',
        email: 'hacker2@example.com',
        password: 'password123',
        role: 'moderator',
      });

    expect(res.status).toBe(400);
  });

  it('should reject short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test',
        email: 'short@example.com',
        password: '12345',
      });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Login User',
        email: 'login@example.com',
        password: 'password123',
      });
  });

  it('should login with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Login User');
    // Should set a cookie
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
  });

  it('should reject non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexist@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('should return user when authenticated', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Me User',
        email: 'me@example.com',
        password: 'password123',
      });

    const cookies = registerRes.headers['set-cookie'];

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Me User');
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('should clear auth cookie', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Logout User',
        email: 'logout@example.com',
        password: 'password123',
      });

    const cookies = registerRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
  });
});
