const Sequelize = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
})

const User = sequelize.define('user', {
  // attributes
  firstName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  lastName: {
    type: Sequelize.STRING
  }
})

const Secret = sequelize.define('secret', {
  text: {
    type: Sequelize.TEXT,
    allowNull: false
  }
})

Secret.belongsTo(User)
User.hasMany(Secret)

module.exports = {
  sequelize,
  Secret,
  User
}
