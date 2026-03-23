const request = require('supertest');
const createApp = require('./app');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const AmbulanceRequest = require('../models/AmbulanceRequest');

let app;

beforeAll(() => {
  app = createApp();
});

// --- Helpers ---

async function registerAndLogin(app, userData) {
  const res = await request(app)
    .post('/api/auth/register')
    .send(userData);
  return { user: res.body.user, cookies: res.headers['set-cookie'] };
}

async function createHospital() {
  return Hospital.create({
    name: 'Test Hospital',
    address: '123 Test St',
    location: { type: 'Point', coordinates: [90.4125, 23.8103] },
    total_icu_beds: 10,
    available_icu_beds: 5,
    contact: { phone: '01700000000' },
  });
}

async function createPatientAndDriver() {
  const patient = await registerAndLogin(app, {
    name: 'Patient User',
    email: 'patient@example.com',
    password: 'password123',
  });
  const driver = await registerAndLogin(app, {
    name: 'Driver User',
    email: 'driveruser@example.com',
    password: 'password123',
    role: 'driver',
    vehicle_details: { plate_number: 'DHA-9999', vehicle_type: 'basic' },
  });
  return { patient, driver };
}

// --- Tests ---

describe('POST /api/ambulance/request', () => {
  let hospital, patient;

  beforeEach(async () => {
    hospital = await createHospital();
    const users = await createPatientAndDriver();
    patient = users.patient;
  });

  it('should create an ambulance request', async () => {
    const res = await request(app)
      .post('/api/ambulance/request')
      .set('Cookie', patient.cookies)
      .send({
        hospital: hospital._id.toString(),
        longitude: 90.4125,
        latitude: 23.8103,
        pickup_address: '456 Emergency Lane, Dhaka',
        emergency_type: 'critical',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.status).toBe('pending');
    expect(res.body.emergency_type).toBe('critical');
    expect(res.body.pickup_address).toBe('456 Emergency Lane, Dhaka');
  });

  it('should reject duplicate active request', async () => {
    await request(app)
      .post('/api/ambulance/request')
      .set('Cookie', patient.cookies)
      .send({
        hospital: hospital._id.toString(),
        longitude: 90.4125,
        latitude: 23.8103,
        pickup_address: 'First request address',
      });

    const res = await request(app)
      .post('/api/ambulance/request')
      .set('Cookie', patient.cookies)
      .send({
        hospital: hospital._id.toString(),
        longitude: 90.4125,
        latitude: 23.8103,
        pickup_address: 'Second request address',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already have an active/i);
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/ambulance/request')
      .send({
        hospital: hospital._id.toString(),
        longitude: 90.4125,
        latitude: 23.8103,
        pickup_address: 'Some address',
      });

    expect(res.status).toBe(401);
  });
});

describe('PUT /api/ambulance/:id/accept', () => {
  let hospital, patient, driver;

  beforeEach(async () => {
    hospital = await createHospital();
    const users = await createPatientAndDriver();
    patient = users.patient;
    driver = users.driver;
  });

  it('should allow a driver to accept a pending request', async () => {
    const createRes = await request(app)
      .post('/api/ambulance/request')
      .set('Cookie', patient.cookies)
      .send({
        hospital: hospital._id.toString(),
        longitude: 90.4125,
        latitude: 23.8103,
        pickup_address: 'Test pickup',
      });

    const res = await request(app)
      .put(`/api/ambulance/${createRes.body._id}/accept`)
      .set('Cookie', driver.cookies);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
    expect(res.body.driver).toBeDefined();
  });

  it('should reject accepting a non-pending request', async () => {
    const createRes = await request(app)
      .post('/api/ambulance/request')
      .set('Cookie', patient.cookies)
      .send({
        hospital: hospital._id.toString(),
        longitude: 90.4125,
        latitude: 23.8103,
        pickup_address: 'Test pickup',
      });

    // Accept it first
    await request(app)
      .put(`/api/ambulance/${createRes.body._id}/accept`)
      .set('Cookie', driver.cookies);

    // Register another driver and try to accept the same request
    const driver2 = await registerAndLogin(app, {
      name: 'Driver Two',
      email: 'driver2@example.com',
      password: 'password123',
      role: 'driver',
      vehicle_details: { plate_number: 'DHA-8888', vehicle_type: 'basic' },
    });

    const res = await request(app)
      .put(`/api/ambulance/${createRes.body._id}/accept`)
      .set('Cookie', driver2.cookies);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found or already accepted/i);
  });

  it('should reject non-driver from accepting', async () => {
    const createRes = await request(app)
      .post('/api/ambulance/request')
      .set('Cookie', patient.cookies)
      .send({
        hospital: hospital._id.toString(),
        longitude: 90.4125,
        latitude: 23.8103,
        pickup_address: 'Test pickup',
      });

    const res = await request(app)
      .put(`/api/ambulance/${createRes.body._id}/accept`)
      .set('Cookie', patient.cookies);

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/ambulance/:id/status', () => {
  let hospital, patient, driver, requestId;

  beforeEach(async () => {
    hospital = await createHospital();
    const users = await createPatientAndDriver();
    patient = users.patient;
    driver = users.driver;

    // Create and accept a request
    const createRes = await request(app)
      .post('/api/ambulance/request')
      .set('Cookie', patient.cookies)
      .send({
        hospital: hospital._id.toString(),
        longitude: 90.4125,
        latitude: 23.8103,
        pickup_address: 'Status test address',
      });
    requestId = createRes.body._id;

    await request(app)
      .put(`/api/ambulance/${requestId}/accept`)
      .set('Cookie', driver.cookies);
  });

  it('should allow valid transition: accepted -> en-route', async () => {
    const res = await request(app)
      .put(`/api/ambulance/${requestId}/status`)
      .set('Cookie', driver.cookies)
      .send({ status: 'en-route' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('en-route');
  });

  it('should allow valid transition: en-route -> completed', async () => {
    await request(app)
      .put(`/api/ambulance/${requestId}/status`)
      .set('Cookie', driver.cookies)
      .send({ status: 'en-route' });

    const res = await request(app)
      .put(`/api/ambulance/${requestId}/status`)
      .set('Cookie', driver.cookies)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.completed_at).toBeDefined();
  });

  it('should reject invalid transition: accepted -> completed', async () => {
    const res = await request(app)
      .put(`/api/ambulance/${requestId}/status`)
      .set('Cookie', driver.cookies)
      .send({ status: 'completed' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot transition/i);
  });

  it('should reject non-owner driver from updating status', async () => {
    const otherDriver = await registerAndLogin(app, {
      name: 'Other Driver',
      email: 'otherdriver@example.com',
      password: 'password123',
      role: 'driver',
      vehicle_details: { plate_number: 'CTG-1111', vehicle_type: 'advanced' },
    });

    const res = await request(app)
      .put(`/api/ambulance/${requestId}/status`)
      .set('Cookie', otherDriver.cookies)
      .send({ status: 'en-route' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/not your assigned/i);
  });
});

describe('PUT /api/ambulance/:id/cancel', () => {
  let hospital, patient, driver;

  beforeEach(async () => {
    hospital = await createHospital();
    const users = await createPatientAndDriver();
    patient = users.patient;
    driver = users.driver;
  });

  it('should allow patient to cancel a pending request', async () => {
    const createRes = await request(app)
      .post('/api/ambulance/request')
      .set('Cookie', patient.cookies)
      .send({
        hospital: hospital._id.toString(),
        longitude: 90.4125,
        latitude: 23.8103,
        pickup_address: 'Cancel test',
      });

    const res = await request(app)
      .put(`/api/ambulance/${createRes.body._id}/cancel`)
      .set('Cookie', patient.cookies);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('should reject cancellation by non-owner', async () => {
    const createRes = await request(app)
      .post('/api/ambulance/request')
      .set('Cookie', patient.cookies)
      .send({
        hospital: hospital._id.toString(),
        longitude: 90.4125,
        latitude: 23.8103,
        pickup_address: 'Cancel test',
      });

    // Another user tries to cancel
    const otherUser = await registerAndLogin(app, {
      name: 'Other User',
      email: 'other@example.com',
      password: 'password123',
    });

    const res = await request(app)
      .put(`/api/ambulance/${createRes.body._id}/cancel`)
      .set('Cookie', otherUser.cookies);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found or cannot be cancelled/i);
  });

  it('should reject cancelling an en-route request', async () => {
    const createRes = await request(app)
      .post('/api/ambulance/request')
      .set('Cookie', patient.cookies)
      .send({
        hospital: hospital._id.toString(),
        longitude: 90.4125,
        latitude: 23.8103,
        pickup_address: 'Cancel test',
      });

    // Accept and move to en-route
    await request(app)
      .put(`/api/ambulance/${createRes.body._id}/accept`)
      .set('Cookie', driver.cookies);
    await request(app)
      .put(`/api/ambulance/${createRes.body._id}/status`)
      .set('Cookie', driver.cookies)
      .send({ status: 'en-route' });

    const res = await request(app)
      .put(`/api/ambulance/${createRes.body._id}/cancel`)
      .set('Cookie', patient.cookies);

    expect(res.status).toBe(404);
  });
});
