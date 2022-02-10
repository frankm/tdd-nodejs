const app = require('./src/app');
const sequelize = require('./src/config/db');
const User = require('./src/user/User');

const range = (start, end) => {
  if (end === undefined) {
    end = start;
    start = 1;
  }
  return [...Array(end - start + 1).keys()].map((i) => start + i);
};

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  for (const i of range(activeUserCount + inactiveUserCount)) {
    await User.create({
      username: `user${i}`,
      email: `user${i}@mail.com`,
      active: i <= activeUserCount,
    });
  }
};

sequelize.sync({ force: true }).then(async () => {
  await addUsers(25);
});

app.listen(3000, () => console.log('app is running'));
