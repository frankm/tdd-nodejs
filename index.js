const app = require('./src/app');
const sequelize = require('./src/config/dbInstance');
const TokenService = require('./src/auth/TokenService');
const logger = require('./src/shared/logger');
const host = require('ip').address();

sequelize.sync();

TokenService.scheduleCleanup();

const port = parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
  logger.info(`app running on http://${host}:${port} verson: ${process.env.npm_package_version}`);
});
