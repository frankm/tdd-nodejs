const dotenv = require('dotenv');
const env = require('env-var');

const priority = `.env.${process.env.NODE_ENV}.local`;
const shared = `.env.${process.env.NODE_ENV}`;

console.log(`shared file = ${shared}`);
console.log(`priority file = ${priority}\n`);

// priority is read first
dotenv.config({ path: priority });
dotenv.config({ path: shared });

const appConfig = {
  db: {
    name: env.get('DATABASE').asString(),
    username: env.get('DB_USERNAME').asString(),
    password: env.get('DB_PASSWORD').asString(),
    dialect: env.get('DB_DIALECT').asString(),
    storage: env.get('DB_STORAGE').asString(),
    logging: env.get('DB_LOGGING').default('false').asBoolStrict(),
  },
};

module.exports = appConfig;
