const Sequelize = require('sequelize');
const appConfig = require('./config');

const dbConfig = appConfig.db;

const sequelize = new Sequelize(
  dbConfig.name,
  dbConfig.username,
  dbConfig.password,
  {
    dialect: dbConfig.dialect,
    storage: dbConfig.storage,
    logging: dbConfig.logging,
  }
);

module.exports = sequelize;
