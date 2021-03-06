const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const Token = require('../src/auth/Token');
const sequelize = require('../src/config/dbInstance');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const en = require('../locales/en/translation.json');
const tr = require('../locales/tr/translation.json');

beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

const usersUrl = '/api/1.0/users';
const authenticationUrl = '/api/1.0/auth';
const logoutUrl = '/api/1.0/logout';
const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

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

const postAuthentication = async (credentials, options = {}) => {
  let agent = request(app).post(authenticationUrl);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return await agent.send(credentials);
};

const postLogout = (options = {}) => {
  const agent = request(app).post(logoutUrl);
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send();
};

describe('Authentication', () => {
  it('returns 200, when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication({ email: activeUser.email, password: activeUser.password });
    expect(response.status).toBe(200);
  });

  it('returns only user id, username, token, and image,  when login success', async () => {
    const user = await addUser();
    const response = await postAuthentication({ email: activeUser.email, password: activeUser.password });
    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body).sort()).toEqual(['id', 'username', 'token', 'image'].sort());
  });

  it('returns 401, when user does not exist', async () => {
    const response = await postAuthentication({ email: activeUser.email, password: activeUser.password });
    expect(response.status).toBe(401);
  });
  it('returns proper error body, when authentication fails', async () => {
    const nowInMillis = new Date().getTime();
    const response = await postAuthentication({ email: activeUser.email, password: activeUser.password });
    const error = response.body;
    expect(error.path).toBe(authenticationUrl);
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.authentication_failure}
    ${'en'}  | ${en.authentication_failure}
  `('returns $message when authentication fails and language is set as $language', async ({ language, message }) => {
    const response = await postAuthentication({ email: activeUser.email, password: activeUser.password }, { language });
    expect(response.body.message).toBe(message);
  });
  it('returns 401, when password is wrong', async () => {
    await addUser();
    const response = await postAuthentication({ email: activeUser.email, password: 'wrong-password' });
    expect(response.status).toBe(401);
  });

  it('returns 403, when logging in with inactive user', async () => {
    const inactiveUser = { ...activeUser, active: false };
    await addUser(inactiveUser);
    const response = await postAuthentication({ email: activeUser.email, password: activeUser.password });
    expect(response.status).toBe(403);
  });

  it('returns proper error body, when inactive user authentication fails', async () => {
    const inactiveUser = { ...activeUser, active: false };
    await addUser(inactiveUser);
    const nowInMillis = new Date().getTime();
    const response = await postAuthentication({ email: activeUser.email, password: activeUser.password });
    const error = response.body;
    expect(error.path).toBe(authenticationUrl);
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.inactive_authentication_failure}
    ${'en'}  | ${en.inactive_authentication_failure}
  `(
    'returns $message when authentication fails for inactive account and language is set as $language',
    async ({ language, message }) => {
      const inactiveUser = { ...activeUser, active: false };
      await addUser(inactiveUser);
      const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' }, { language });
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 401, when email is not valid', async () => {
    const response = await postAuthentication({ password: activeUser.password });
    expect(response.status).toBe(401);
  });

  it('returns 401, when password is not valid', async () => {
    const response = await postAuthentication({ email: activeUser.email });
    expect(response.status).toBe(401);
  });

  it('returns token, when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.body.token).not.toBeUndefined();
  });
});

describe('Logout', () => {
  it('returns 200 ok, when unauthorized logout request ', async () => {
    const response = await postLogout();
    expect(response.status).toBe(200);
  });

  it('removes token from db ', async () => {
    await addUser();
    const response = await postAuthentication({ email: activeUser.email, password: activeUser.password });
    const token = response.body.token;
    await postLogout({ token: token });
    const storedToken = await Token.findOne({ where: { token: token } });
    expect(storedToken).toBeNull();
  });
});

describe('Token Expiration', () => {
  const putUser = async (id = 5, body = null, options = {}) => {
    let agent = request(app);

    agent = request(app).put(usersUrl + '/' + id);
    if (options.token) {
      agent.set('Authorization', `Bearer ${options.token}`);
    }
    return agent.send(body);
  };

  it('returns 403, when token is older than 1 week', async () => {
    const savedUser = await addUser();
    const token = 'test-token';
    const oneWeekAgo = new Date(Date.now() - 7 * DAY_IN_MILLIS);
    await Token.create({
      token: token,
      userId: savedUser.id,
      lastUsedAt: oneWeekAgo,
    });
    const validUpdate = { username: 'user1-update' };
    const response = await putUser(savedUser.id, validUpdate, { token: token });
    expect(response.status).toBe(403);
  });

  it('refreshes lastUsedAt, when unexpired token is used', async () => {
    const savedUser = await addUser();
    const token = 'test-token';
    const fourDaysAgo = new Date(Date.now() - 4 * DAY_IN_MILLIS);
    await Token.create({
      token: token,
      userId: savedUser.id,
      lastUsedAt: fourDaysAgo,
    });
    const validUpdate = { username: 'user1-update' };
    const rightBeforeSendingRequest = new Date();
    await putUser(savedUser.id, validUpdate, { token: token });
    const tokeninDB = await Token.findOne({ where: { token: token } });
    expect(tokeninDB.lastUsedAt.getTime()).toBeGreaterThan(rightBeforeSendingRequest.getTime());
  });

  it('refreshes lastUsedAt, when unexpired token accesses unauthenticated endpoint', async () => {
    const savedUser = await addUser();
    const token = 'test-token';
    const fourDaysAgo = new Date(Date.now() - 4 * DAY_IN_MILLIS);
    await Token.create({
      token: token,
      userId: savedUser.id,
      lastUsedAt: fourDaysAgo,
    });
    const rightBeforeSendingRequest = new Date();
    await request(app)
      .get(usersUrl + '/5')
      .set('Authorization', `Bearer ${token}`);
    const tokeninDB = await Token.findOne({ where: { token: token } });
    expect(tokeninDB.lastUsedAt.getTime()).toBeGreaterThan(rightBeforeSendingRequest.getTime());
  });
});
