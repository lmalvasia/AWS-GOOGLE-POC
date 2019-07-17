const dotenv = require('dotenv')
dotenv.config()
const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const routes = require('./routes/index')
const port = process.env.PORT || 3000

const app = express()

app.use(function(req, res, next) {
  res.setTimeout(600000, function() {
    console.log('Request has timed out.')
    res.send(408)
  })
  next()
})

app.use(express.static(__dirname + '/public'))

app.set('view engine', 'ejs')

app.use(morgan('dev'))
app.use(
  bodyParser.urlencoded({
    extended: false
  })
)
app.use(bodyParser.json())

app.use('/', routes)

app.listen(port, function() {
  console.log('Server complete on localhost:' + port)
})
