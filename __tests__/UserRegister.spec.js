const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/db');

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  User.destroy({ truncate: true });
});

describe('User Registration', () => {
  const user1 = {
    username: 'user1',
    email: 'user1@mail.com',
    password: 'P4ssword',
  };
  const postValidUser = () => {
    return request(app).post('/api/1.0/users').send(user1);
  };

  it('returns 200 OK for valid signup request', async () => {
    const res = await postValidUser();
    expect(res.status).toBe(200);
  });

  it('returns success message for valid signup request', async () => {
    const res = await postValidUser();
    expect(res.body.message).toBe('User created');
  });

  it('saves user to db', async () => {
    await postValidUser();

    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves username & email to db', async () => {
    await postValidUser();

    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe(user1.username);
    expect(savedUser.email).toBe(user1.email);
  });

  it('hashes password in db', async () => {
    await postValidUser();

    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe(user1.password);
  });
});
