const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/db');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const en = require('../locales/en/translation.json');
const tr = require('../locales/tr/translation.json');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
});

const usersUrl = '/api/1.0/users';

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  active: true,
};

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, saltRounds);
  user.password = hash;
  return await User.create(user);
};

const putUser = (id = 5, body = null, options = {}) => {
  const agent = request(app).put(usersUrl + '/' + id);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  if (options.auth) {
    const { email, password } = options.auth;
    agent.auth(email, password);
  }
  return agent.send(body);
};

describe('User Update', () => {
  it('returns forbidden, when update request without basic authorization', async () => {
    const response = await putUser();
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.unauthroized_user_update}
    ${'en'}  | ${en.unauthroized_user_update}
  `(
    'returns error body with $message for unauthorized request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await putUser(5, null, { language });
      expect(response.body.path).toBe(usersUrl + '/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns forbidden, when incorrect email in basic authorization', async () => {
    await addUser();
    const response = await putUser(5, null, { auth: { email: 'user1000@mail.com', password: 'P4ssword' } });
    expect(response.status).toBe(403);
  });

  it('returns forbidden, when incorrect password in basic authorization', async () => {
    await addUser();
    const response = await putUser(5, null, { auth: { email: activeUser.email, password: 'P4ssword' } });
    expect(response.status).toBe(403);
  });

  it('returns forbidden, when correct credentials for different user', async () => {
    await addUser();
    const userToBeUpdated = await addUser({ ...activeUser, username: 'user2', email: 'user2@mail.com' });
    const response = await putUser(userToBeUpdated.id, null, {
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });
    expect(response.status).toBe(403);
  });

  it('returns forbidden, when inactive user has correct credentials', async () => {
    const inactiveUser = await addUser({ ...activeUser, active: false });
    const response = await putUser(inactiveUser.id, null, {
      auth: { email: inactiveUser.email, password: activeUser.email },
    });
    expect(response.status).toBe(403);
  });
});
