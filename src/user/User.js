const Sequelize = require('sequelize');
const sequelize = require('../config/db');
const Token = require('../auth/Token');

const Model = Sequelize.Model;

class User extends Model {}

User.init(
  {
    username: {
      type: Sequelize.STRING,
    },
    email: {
      type: Sequelize.STRING,
    },
    password: {
      type: Sequelize.STRING,
    },
    active: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    activationToken: {
      type: Sequelize.STRING,
    },
  },
  { sequelize, modelName: 'user' }
);

User.hasMany(Token, { onDelete: 'cascade', foreignKey: 'userId' });

module.exports = User;
