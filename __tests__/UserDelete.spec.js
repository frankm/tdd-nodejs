const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const Token = require('../src/auth/Token');
const sequelize = require('../src/config/db');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const en = require('../locales/en/translation.json');
const tr = require('../locales/tr/translation.json');

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

const auth = async (options = {}) => {
  let token;
  if (options.auth) {
    const response = await request(app).post(authUrl).send(options.auth);
    token = response.body.token;
  }
  return token;
};

const deleteUser = async (id = 5, options = {}) => {
  const agent = request(app).delete(usersUrl + '/' + id);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send();
};

describe('User Delete', () => {
  it('returns forbidden, when delete request is unauthorized', async () => {
    const response = await deleteUser();
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.unauthorized_user_delete}
    ${'en'}  | ${en.unauthorized_user_delete}
  `(
    'returns error body with $message for unauthorized delete request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await deleteUser(5, { language });
      expect(response.body.path).toBe(usersUrl + '/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );
  it('returns forbidden, when delete request with correct credentials for different user', async () => {
    await addUser();
    const userToBeDeleted = await addUser({ ...activeUser, username: 'user2', email: 'user2@mail.com' });
    const token = auth({ auth: { email: 'user1@mail.com', password: 'P4ssword' } });
    const response = await deleteUser(userToBeDeleted.id, { token: token });
    expect(response.status).toBe(403);
  });
  it('returns 403, when token is not valid', async () => {
    const response = await deleteUser(5, { token: '123' });
    expect(response.status).toBe(403);
  });
  it('returns 200 ok, when delete request from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({ auth: { email: activeUser.email, password: activeUser.password } });
    const response = await deleteUser(savedUser.id, { token: token });
    expect(response.status).toBe(200);
  });
  it('deletes user from db, when delete request from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({ auth: { email: activeUser.email, password: activeUser.password } });
    await deleteUser(savedUser.id, { token: token });
    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser).toBeNull();
  });
  it('deletes token from db, when delete request from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({ auth: { email: activeUser.email, password: activeUser.password } });
    await deleteUser(savedUser.id, { token: token });
    const tokenInDB = await Token.findOne({ where: { token: token } });
    expect(tokenInDB).toBeNull();
  });
  it('deletes all token from db, when delete request from authorized user', async () => {
    const savedUser = await addUser();
    const token1 = await auth({ auth: { email: activeUser.email, password: activeUser.password } });
    const token2 = await auth({ auth: { email: activeUser.email, password: activeUser.password } });
    await deleteUser(savedUser.id, { token: token1 });
    const tokenInDB = await Token.findOne({ where: { token: token2 } });
    expect(tokenInDB).toBeNull();
  });
});
