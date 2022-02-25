const app = require('./src/app');
const sequelize = require('./src/config/db');
const TokenService = require('./src/auth/TokenService');

sequelize.sync();

TokenService.scheduleCleanup();

app.listen(3000, () => console.log('app is running'));
