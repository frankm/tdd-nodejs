const sequelize = require('../src/config/db');
const Token = require('../src/auth/Token');
const TokenService = require('../src/auth/TokenService');

beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  await Token.destroy({ truncate: true });
});
const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

describe('Scheduled Token Cleanup', () => {
  it('clears expired token, when scheduled task', async () => {
    jest.useFakeTimers();
    const token = 'test-token';
    const eightDaysAgo = new Date(Date.now() - 8 * DAY_IN_MILLIS);
    await Token.create({
      token: token,
      lastUsedAt: eightDaysAgo,
    });
    TokenService.scheduleCleanup();
    jest.advanceTimersByTime(60 * 60 * 1000 + 5000);
    const tokeninDB = await Token.findOne({ where: { token: token } });
    expect(tokeninDB).toBeNull();
  });
});
