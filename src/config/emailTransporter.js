const nodemailer = require('nodemailer');
const appConfig = require('./config');

const mailConfig = appConfig.mail;

const transporter = nodemailer.createTransport({ ...mailConfig });

module.exports = transporter;
