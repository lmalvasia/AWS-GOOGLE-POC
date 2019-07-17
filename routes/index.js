const express = require('express')
const cors = require('cors')
const router = require('express-promise-router')()
const home = require('./upload')

router.use(cors())

router.use('/', home)

module.exports = router
