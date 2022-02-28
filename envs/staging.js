const appConfig = require('../src/config/config');

module.exports = {
  database: appConfig.db,
  mail: appConfig.mail,
  folders: appConfig.folders,
};
