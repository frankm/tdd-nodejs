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

let mail;
if (process.env.NODE_ENV === 'development') {
  mail = {
    host: get('MAIL_HOST').asString(),
    port: get('MAIL_PORT').asPortNumber(),
    auth: {
      user: get('MAIL_USER').asString(),
      pass: get('MAIL_PASS').asString(),
    },
  };
}

if (process.env.NODE_ENV === 'test') {
  mail = {
    host: get('MAIL_HOST').asString(),
    port: get('MAIL_PORT').asPortNumber(),
    tls: {
      rejectUnauthorized: get('REJECT_UNAUTHORIZED').asBoolStrict(),
    },
  };
}

const appConfig = {
  db: {
    name: get('DATABASE').asString(),
    username: get('DB_USERNAME').asString(),
    password: get('DB_PASSWORD').asString(),
    dialect: get('DB_DIALECT').asString(),
    storage: get('DB_STORAGE').asString(),
    logging: get('DB_LOGGING').default('false').asBoolStrict(),
  },
  mail: { ...mail },
};

module.exports = appConfig;
