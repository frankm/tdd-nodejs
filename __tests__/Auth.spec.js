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
const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  active: true,
};

const addUser = async () => {
  const user = {
    username: validUser.username,
    email: validUser.email,
    password: validUser.password,
    active: true,
  };

  const hash = await bcrypt.hash(user.password, saltRounds);
  user.password = hash;
  return await User.create(user);
};

const postAuthentication = async (credentials) => {
  return await request(app).post(authenticationUrl).send(credentials);
};

describe('Authentication', () => {
  it('returns 200, when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication({ email: validUser.email, password: validUser.password });
    expect(response.status).toBe(200);
  });

  it('returns only user id and username, when login success', async () => {
    const user = await addUser();
    const response = await postAuthentication({ email: user.email, password: user.password });
    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(['id', 'username']);
  });
});
