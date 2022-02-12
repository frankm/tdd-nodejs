const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/db');
const en = require('../locales/en/translation.json');
const tr = require('../locales/tr/translation.json');

const usersUrl = '/api/1.0/users';

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
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

const createUser = async (active = true) => {
  return await User.create({
    username: 'user1',
    email: 'user1@mail.com',
    active: active,
  });
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
  it('returns users on 2nd page and page index, when page index 1 is requested', async () => {
    await addUsers(11);
    const response = await getUsers().query({ page: 1 });
    expect(response.body.content[0].username).toBe('user11');
    expect(response.body.page).toBe(1);
  });
  it('returns users on 1st page, when negative page index is requested', async () => {
    await addUsers(11);
    const response = await getUsers().query({ page: -5 });
    expect(response.body.page).toBe(0);
  });
  it('returns 5 users and page size, when size 5 is requested', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 5 });
    expect(response.body.content.length).toBe(5);
    expect(response.body.size).toBe(5);
  });
  it('returns 10 users and page size, when size 1000 is requested', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 1000 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });
  it('returns 10 users and page size, when size 0 is requested', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 0 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });
  it('returns page index = 0 and size = 10, when non-numbers are provided for page and size', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 'size', page: 'page' });
    expect(response.body.page).toBe(0);
    expect(response.body.size).toBe(10);
  });
});

describe('Get User', () => {
  const getUser = (id = 5) => {
    return request(app).get(usersUrl + '/' + id);
  };
  it('returns 404, when user not found', async () => {
    const response = await getUser();
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.user_not_found}
    ${'en'}  | ${en.user_not_found}
  `('returns $message for unknown user when language is set to $language', async ({ language, message }) => {
    const response = await getUser().set('Accept-Language', language);
    expect(response.body.message).toBe(message);
  });
  it('returns proper error body, when user not found', async () => {
    const nowInMillis = new Date().getTime();
    const response = await getUser();
    const error = response.body;
    expect(error.path).toBe(usersUrl + '/5');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });
  it('returns 200, when active user exists', async () => {
    const validUser = await createUser();
    const response = await getUser(validUser.id);
    expect(response.status).toBe(200);
  });

  it('returns only id, username, and email in response body, when active user exists', async () => {
    const validUser = await createUser();
    const response = await getUser(validUser.id);
    expect(Object.keys(response.body)).toEqual(['id', 'username', 'email']);
  });

  it('returns 404, when user is inactive', async () => {
    const inactiveUser = await createUser(false);
    const response = await getUser(inactiveUser.id);
    expect(response.status).toBe(404);
  });
});
