const app = require('./src/app');
const sequelize = require('./src/config/db');
const TokenService = require('./src/auth/TokenService');
const logger = require('./src/shared/logger');

sequelize.sync();

TokenService.scheduleCleanup();
const port = process.env.PORT || 3000;
app.listen(port, () => logger.info('app is running. verson: ' + process.env.npm_package_version));
