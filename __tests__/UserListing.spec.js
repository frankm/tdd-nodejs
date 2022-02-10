const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/db');

const usersUrl = '/api/1.0/users';

beforeAll(async () => {
  await sequelize.sync();
});
beforeEach(() => {
  User.destroy({ truncate: true });
});

const getUsers = () => {
  return request(app).get(usersUrl);
};

const range = (start, end) => {
  if (end === undefined) {
    end = start;
    start = 1;
  }
  return [...Array(end - start + 1).keys()].map((i) => start + i);
};

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  for (const i of range(activeUserCount + inactiveUserCount)) {
    await User.create({
      username: `user${i}`,
      email: `user${i}@mail.com`,
      active: i <= activeUserCount,
    });
  }
};

describe('Listing Users', () => {
  it('returns 200 OK, when no users in db', async () => {
    const response = await getUsers();
    expect(response.status).toBe(200);
  });

  it('returns page object', async () => {
    const response = await getUsers();
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });
  it('returns 10 users in a page, when 11 active users in db', async () => {
    await addUsers(11);
    const response = await getUsers();
    expect(response.body.content.length).toBe(10);
  });

  it('returns 6 users in page content, when 6 active users and 5 inactive users in db', async () => {
    await addUsers(6, 5);
    const response = await getUsers();
    expect(response.body.content.length).toBe(6);
  });

  it('returns only id, username, and email in content array, for each user', async () => {
    await addUsers(11);
    const response = await getUsers();
    const user = response.body.content[0];
    expect(Object.keys(user).sort()).toEqual(['id', 'username', 'email'].sort());
  });

  it('returns 2 totalPages, when 15 active and 7 inactive users', async () => {
    await addUsers(15, 7);
    const response = await getUsers();
    expect(response.body.totalPages).toBe(2);
  });
});
