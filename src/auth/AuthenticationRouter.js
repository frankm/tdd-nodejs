const express = require('express');
const router = express.Router();
const UserService = require('../user/UserService');

const authUrl = '/api/1.0/auth';

router.post(authUrl, async (req, res) => {
  const { email } = req.body;
  const user = await UserService.findByEmail(email);
  res.send({
    id: user.id,
    username: user.username,
  });
});

module.exports = router;
