const express = require('express');
const UserRouter = require('./user/UserRouter');

const app = express();
app.use(express.json());

app.use(UserRouter);

console.log('NODE_ENV:', process.env.NODE_ENV);

module.exports = app;
