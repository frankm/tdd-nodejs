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
  it('returns 200 OK & success message for valid signup request', async () => {
    const user1 = {
      username: 'user1',
      email: 'user1@mail.com',
      password: 'P4ssword',
    };

    const res = await request(app)
      .post('/api/1.0/users')
      .send(user1)
      .expect(200);
    expect(res.body.message).toBe('User created');
  });

  it('saves user to db', async () => {
    const user1 = {
      username: 'user1',
      email: 'user1@mail.com',
      password: 'P4ssword',
    };

    await request(app).post('/api/1.0/users').send(user1).expect(200);

    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves username & email to db', async () => {
    const user1 = {
      username: 'user1',
      email: 'user1@mail.com',
      password: 'P4ssword',
    };

    await request(app).post('/api/1.0/users').send(user1).expect(200);

    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe(user1.username);
    expect(savedUser.email).toBe(user1.email);
  });

  it('hashes password in db', async () => {
    const user1 = {
      username: 'user1',
      email: 'user1@mail.com',
      password: 'P4ssword',
    };

    await request(app).post('/api/1.0/users').send(user1).expect(200);

    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe(user1.password);
  });
});
