const request = require('supertest');
const app = require('../src/app');

const usersUrl = '/api/1.0/users';

describe('Listing Users', () => {
  it('returns 200 OK, when no users in db', async () => {
    const response = await request(app).get(usersUrl);
    expect(response.status).toBe(200);
  });

  it('returns page object', async () => {
    const response = await request(app).get(usersUrl);
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });
});
