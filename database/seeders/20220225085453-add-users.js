'use strict';
const Utils = require('../../src/shared/Utils');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;
const NEW_USERS = 25;

module.exports = {
  async up(queryInterface, Sequelize) {
    const hash = await bcrypt.hash('P4ssword', SALT_ROUNDS);
    const users = [];
    for (const i of Utils.range(NEW_USERS)) {
      users.push({
        username: `user${i}`,
        email: `user${i}@mail.com`,
        active: true,
        password: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    await queryInterface.bulkInsert('users', users, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  },
};
