title: Express JSON:API Controller Documentation
---
# Express JSON:API Controller
Base controller class for express apps to create JSON:API endpoints for sequelize models

## Installation
```sh
yarn add @coding-blocks/express-jsonapi-controller
```

## Usage
```js
// import your sequelize models
const DB = require('./models')

// import serializer for your model
const UserSerializer = require('./serializers/user')

// Get the controller
const { Controller } = require('express-jsonapi-controller')
const MyController = new Controller(
  DB.User, // Model you want to create controller instance for
  DB, // Models import for getting related models
  UserSerializer
)

// Create your endpoints
router.get('/', MyController.handleQuery)

```

## Creating Serializers
We use jsonapi-serializer for serializing models
```js
/*
export a function with following arguments
@params [included] included models config
@params [type] serialize or deserialize
@params [config] meta config
*/
module.exports = (included, type, config) => {
  return {
    attributes: ['firstName', 'lastName'],
    ...config
  };
};
```

## Available Methods
- ``` Controller.handleQuery() ```
- ``` Controller.handleQueryById() ```
- ``` Controller.handleUpdateById() ```
- ``` Controller.handleDeleteById() ```
