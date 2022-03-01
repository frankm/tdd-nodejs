const app = require('./src/app');
const sequelize = require('./src/config/db');
const TokenService = require('./src/auth/TokenService');
const logger = require('./src/shared/logger');

sequelize.sync();

TokenService.scheduleCleanup();

app.listen(3000, () => logger.info('app is running. verson: ' + process.env.npm_package_version));
