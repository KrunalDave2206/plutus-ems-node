const { password } = require('../models/employees')
const route = require('express').Router();
const v1 = require('./v1');


route.use('/v1', v1);
route.get('/pass/:password', password)

module.exports = route;