const User = require('../src/user/User');
const UserService = require('../src/user/UserService');
const sequelize = require('../src/config/dbinstance');
const SMTPServer = require('smtp-server').SMTPServer;
const envs = require('../envs');

const AuthenticationRequiredException = require('../src/error/AuthenticationRequiredException');

let lastMail, server;
let simulateSmtpFailure = false;
let simulateSmtpAuthenticationFalilure = false;

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const err = new Error('Invalid mailbox');
          err.responseCode = 553;
          return callback(err);
        }
        if (simulateSmtpAuthenticationFalilure) {
          const err = new AuthenticationRequiredException('smtp_authentication_required');
          err.responseCode = 530;
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });

  await server.listen(envs[process.env.NODE_ENV].mail.port, 'localhost');

  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  simulateSmtpAuthenticationFalilure = false;

  await User.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  await server.close();
});

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
};

describe('SMTP', () => {
  it('sends test email, when SMTP is configured correctly', async () => {
    await UserService.sendTestMail(validUser.email);
    expect(lastMail).toContain(validUser.email);
  });

  it('returns 530 Authentication Required, when SMTP not configured', async () => {
    simulateSmtpAuthenticationFalilure = true;
    let response;

    try {
      await UserService.sendTestMail(validUser.email);
    } catch (err) {
      response = err;
    }
    expect(response.status).toBe(530);
  });

  it('returns Authentication Required Message, when SMTP not configured', async () => {
    simulateSmtpAuthenticationFalilure = true;
    // appConfig.mail.host = '';
    let response;
    try {
      await UserService.sendTestMail(validUser.email);
    } catch (err) {
      response = err;
    }
    expect(response.message).toBe('smtp_authentication_required');
  });
});
