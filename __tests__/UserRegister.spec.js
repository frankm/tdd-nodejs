const request = require('supertest');
const app = require('../src/app');

describe('User Registration', () => {
  it('returns 200 OK & success message for valid signup request', async () => {
    const user1 = {
      username: 'user1',
      email: 'user1@mail.com',
      password: 'P4ssword',
    };

    const res = await request(app)
      .post('/api/1.0/users')
      .send(user1)
      .expect(200);
    expect(res.body.message).toBe('User created');
  });
});
