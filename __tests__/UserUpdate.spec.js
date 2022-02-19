const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/db');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const en = require('../locales/en/translation.json');
const tr = require('../locales/tr/translation.json');
const fs = require('fs');
const path = require('path');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

const usersUrl = '/api/1.0/users';
const authUrl = '/api/1.0/auth';

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

const putUser = async (id = 5, body = null, options = {}) => {
  let agent = request(app);
  let token;
  if (options.auth) {
    const response = await agent.post(authUrl).send(options.auth);
    token = response.body.token;
  }

  agent = request(app).put(usersUrl + '/' + id);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
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
    ${'tr'}  | ${tr.unauthorized_user_update}
    ${'en'}  | ${en.unauthorized_user_update}
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

  it('returns 200 ok, when valid update request from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated' };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(200);
  });

  it('update username in db, when valid update request from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated' };
    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser.username).toBe(validUpdate.username);
  });

  it('returns 403, when token is not valid', async () => {
    const response = await putUser(5, null, { token: '123' });
    expect(response.status).toBe(403);
  });

  it('saves user image, when update contains image as base64', async () => {
    const filePath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const fileInBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: activeUser.password },
    });
    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser.image).toBeTruthy();
  });
});
