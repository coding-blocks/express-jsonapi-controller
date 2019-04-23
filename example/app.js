const Express = require('express')
const Router = require('./router')
const { sequelize } = require('./models')

const app = Express()

app.use(Router)

sequelize.sync().then(() => {
  app.listen(3000, () => {
    console.log("App started on port 3000")
  })
})
