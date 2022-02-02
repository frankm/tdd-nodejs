const dotenv = require('dotenv');
const { get } = require('env-var');

const priority = `.env.${process.env.NODE_ENV}.local`;
const shared = `.env.${process.env.NODE_ENV}`;

if (process.env.NODE_ENV === 'development') {
  console.log(`shared file = ${shared}`);
  console.log(`priority file = ${priority}\n`);
}

// priority is read first
dotenv.config({ path: priority });
dotenv.config({ path: shared });

const appConfig = {
  db: {
    name: get('DATABASE').asString(),
    username: get('DB_USERNAME').asString(),
    password: get('DB_PASSWORD').asString(),
    dialect: get('DB_DIALECT').asString(),
    storage: get('DB_STORAGE').asString(),
    logging: get('DB_LOGGING').default('false').asBoolStrict(),
  },
};

module.exports = appConfig;
