const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/db');
const bcrypt = require('bcrypt');
const saltRounds = 10;

beforeAll(async () => {
  await sequelize.sync();
});
beforeEach(() => {
  User.destroy({ truncate: true });
});

const authenticationUrl = '/api/1.0/auth';
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

describe('Authentication', () => {
  it('returns 200, when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication({ email: activeUser.email, password: activeUser.password });
    expect(response.status).toBe(200);
  });

  it('returns only user id and username, when login success', async () => {
    const user = await addUser();
    const response = await postAuthentication({ email: activeUser.email, password: activeUser.password });
    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(['id', 'username']);
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
    ${'tr'}  | ${'Kullanıcı bilgileri hatalı'}
    ${'en'}  | ${'Incorrect credentials'}
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
    ${'tr'}  | ${'Hesabınız aktif değil'}
    ${'en'}  | ${'Account is inactive'}
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
});