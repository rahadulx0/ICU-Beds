const request = require('supertest');
const createApp = require('./app');
const Hospital = require('../models/Hospital');

let app;
let adminCookies;

beforeAll(() => {
  app = createApp();
});

// Helper to create an admin user and get cookies
async function loginAsAdmin() {
  const User = require('../models/User');

  // Don't pre-hash: the pre-save hook does it
  await User.create({
    name: 'Admin',
    email: 'admin@test.com',
    password: 'admin123',
    role: 'admin',
    is_active: true,
  });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'admin123' });

  return res.headers['set-cookie'];
}

async function loginAsUser() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Regular User',
      email: 'user@test.com',
      password: 'user123456',
    });

  return res.headers['set-cookie'];
}

describe('GET /api/hospitals', () => {
  beforeEach(async () => {
    adminCookies = await loginAsAdmin();
  });

  it('should return empty list initially', async () => {
    const res = await request(app).get('/api/hospitals');

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(0);
  });

  it('should return hospitals after creation', async () => {
    await Hospital.create({
      name: 'Test Hospital',
      address: '123 Main St',
      location: { type: 'Point', coordinates: [90.3742, 23.7461] },
      total_icu_beds: 20,
      available_icu_beds: 15,
      status: 'active',
    });

    const res = await request(app).get('/api/hospitals');

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Test Hospital');
  });
});

describe('POST /api/hospitals', () => {
  it('should create hospital when admin', async () => {
    adminCookies = await loginAsAdmin();

    const res = await request(app)
      .post('/api/hospitals')
      .set('Cookie', adminCookies)
      .send({
        name: 'New Hospital',
        address: '456 Test Ave',
        latitude: 23.7461,
        longitude: 90.3742,
        total_icu_beds: 30,
        available_icu_beds: 25,
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Hospital');
    expect(res.body.total_icu_beds).toBe(30);
  });

  it('should reject creation by regular user', async () => {
    const userCookies = await loginAsUser();

    const res = await request(app)
      .post('/api/hospitals')
      .set('Cookie', userCookies)
      .send({
        name: 'Unauthorized Hospital',
        address: '789 Test St',
        latitude: 23.7461,
        longitude: 90.3742,
        total_icu_beds: 10,
        available_icu_beds: 5,
      });

    expect(res.status).toBe(403);
  });

  it('should reject unauthenticated creation', async () => {
    const res = await request(app)
      .post('/api/hospitals')
      .send({
        name: 'No Auth Hospital',
        address: '000 Test',
        latitude: 23.0,
        longitude: 90.0,
        total_icu_beds: 10,
        available_icu_beds: 5,
      });

    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/hospitals/:id/beds', () => {
  let hospitalId;

  beforeEach(async () => {
    adminCookies = await loginAsAdmin();

    const hospital = await Hospital.create({
      name: 'Bed Test Hospital',
      address: '123 Bed St',
      location: { type: 'Point', coordinates: [90.3742, 23.7461] },
      total_icu_beds: 20,
      available_icu_beds: 15,
      status: 'active',
    });
    hospitalId = hospital._id.toString();
  });

  it('should update bed count', async () => {
    const res = await request(app)
      .patch(`/api/hospitals/${hospitalId}/beds`)
      .set('Cookie', adminCookies)
      .send({
        available_icu_beds: 10,
        version: 0,
      });

    expect(res.status).toBe(200);
    expect(res.body.available_icu_beds).toBe(10);
  });

  it('should reject available > total', async () => {
    const res = await request(app)
      .patch(`/api/hospitals/${hospitalId}/beds`)
      .set('Cookie', adminCookies)
      .send({
        available_icu_beds: 25,
        version: 0,
      });

    expect(res.status).toBe(400);
  });

  it('should reject negative bed count', async () => {
    const res = await request(app)
      .patch(`/api/hospitals/${hospitalId}/beds`)
      .set('Cookie', adminCookies)
      .send({
        available_icu_beds: -1,
        version: 0,
      });

    expect(res.status).toBe(400);
  });
});
