const Express = require('express')
const router = Express.Router()

const DB = require('./models')

const { Controller } = require('../')

const UserSerializer = require('./serializers/user')
const UserController = new Controller(DB.User, DB, UserSerializer, {
  defaultExcludes: ['secret']
})
router.get('/user', UserController.handleQuery)
router.get('/user/:id', UserController.handleQueryById)
router.post('/user', UserController.handleCreate)

const SecretSerializer = require('./serializers/secret')
const SecretController = new Controller(DB.Secret, DB, SecretSerializer)
router.get('/secret', SecretController.handleQuery)
router.get('/secret/:id', SecretController.handleQueryById)
router.post('/secret', SecretController.handleCreate)

module.exports = router
