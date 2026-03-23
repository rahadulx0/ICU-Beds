const request = require('supertest');
const createApp = require('./app');
const Notification = require('../models/Notification');

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

async function createNotifications(userId, count = 3, read = false) {
  const notifications = [];
  for (let i = 0; i < count; i++) {
    notifications.push({
      user: userId,
      type: 'system_announcement',
      title: `Notification ${i + 1}`,
      message: `Test message ${i + 1}`,
      read,
    });
  }
  return Notification.insertMany(notifications);
}

// --- Tests ---

describe('GET /api/notifications', () => {
  let userA, userB;

  beforeEach(async () => {
    userA = await registerAndLogin(app, {
      name: 'User A',
      email: 'usera@example.com',
      password: 'password123',
    });
    userB = await registerAndLogin(app, {
      name: 'User B',
      email: 'userb@example.com',
      password: 'password123',
    });

    // Create notifications for both users
    await createNotifications(userA.user._id, 3);
    await createNotifications(userB.user._id, 2);
  });

  it('should return only the authenticated user\'s notifications', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', userA.cookies);

    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(3);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.unreadCount).toBe(3);
  });

  it('should return correct count for user B', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', userB.cookies);

    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it('should return 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/notifications/unread-count', () => {
  let userA;

  beforeEach(async () => {
    userA = await registerAndLogin(app, {
      name: 'Count User',
      email: 'count@example.com',
      password: 'password123',
    });
    // 2 unread + 1 read
    await createNotifications(userA.user._id, 2, false);
    await createNotifications(userA.user._id, 1, true);
  });

  it('should return the correct unread count', async () => {
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Cookie', userA.cookies);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });
});

describe('PUT /api/notifications/:id/read', () => {
  let userA, userB, notificationsA;

  beforeEach(async () => {
    userA = await registerAndLogin(app, {
      name: 'Read User',
      email: 'readuser@example.com',
      password: 'password123',
    });
    userB = await registerAndLogin(app, {
      name: 'Other User',
      email: 'otheruser@example.com',
      password: 'password123',
    });
    notificationsA = await createNotifications(userA.user._id, 2);
  });

  it('should mark a notification as read', async () => {
    const id = notificationsA[0]._id;

    const res = await request(app)
      .put(`/api/notifications/${id}/read`)
      .set('Cookie', userA.cookies);

    expect(res.status).toBe(200);
    expect(res.body.read).toBe(true);
    expect(res.body._id).toBe(id.toString());
  });

  it('should reject marking another user\'s notification', async () => {
    const id = notificationsA[0]._id;

    const res = await request(app)
      .put(`/api/notifications/${id}/read`)
      .set('Cookie', userB.cookies);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});

describe('PUT /api/notifications/read-all', () => {
  let userA;

  beforeEach(async () => {
    userA = await registerAndLogin(app, {
      name: 'MarkAll User',
      email: 'markall@example.com',
      password: 'password123',
    });
    await createNotifications(userA.user._id, 5, false);
  });

  it('should mark all notifications as read', async () => {
    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Cookie', userA.cookies);

    expect(res.status).toBe(200);

    // Verify via unread count
    const countRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Cookie', userA.cookies);

    expect(countRes.body.count).toBe(0);
  });
});

describe('DELETE /api/notifications/:id', () => {
  let userA, userB, notificationsA;

  beforeEach(async () => {
    userA = await registerAndLogin(app, {
      name: 'Del User',
      email: 'deluser@example.com',
      password: 'password123',
    });
    userB = await registerAndLogin(app, {
      name: 'Del Other',
      email: 'delother@example.com',
      password: 'password123',
    });
    notificationsA = await createNotifications(userA.user._id, 2);
  });

  it('should delete own notification', async () => {
    const id = notificationsA[0]._id;

    const res = await request(app)
      .delete(`/api/notifications/${id}`)
      .set('Cookie', userA.cookies);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('should reject deleting another user\'s notification', async () => {
    const id = notificationsA[0]._id;

    const res = await request(app)
      .delete(`/api/notifications/${id}`)
      .set('Cookie', userB.cookies);

    expect(res.status).toBe(404);
  });
});
