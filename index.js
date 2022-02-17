const app = require('./src/app');
const sequelize = require('./src/config/db');
const User = require('./src/user/User');
const Utils = require('./src/shared/Utils');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const TokenService = require('./src/auth/TokenService');

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  const hash = await bcrypt.hash('P4ssword', saltRounds);
  for (const i of Utils.range(activeUserCount + inactiveUserCount)) {
    await User.create({
      username: `user${i}`,
      email: `user${i}@mail.com`,
      active: i <= activeUserCount,
      password: hash,
    });
  }
};

sequelize.sync({ force: true }).then(async () => {
  await addUsers(25);
});

TokenService.scheduleCleanup();

app.listen(3000, () => console.log('app is running'));
