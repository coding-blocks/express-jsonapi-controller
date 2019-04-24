const Express = require('express');
const router = Express.Router();

const DB = require('./models');
const UserSerializer = require('./serializers/user');

const { Controller } = require('../');
const MyController = new Controller(DB.User, DB, UserSerializer);

router.get('/', MyController.handleQuery);
router.get('/:id', MyController.handleQueryById);

module.exports = router;
