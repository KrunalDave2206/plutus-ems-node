const route = require('express').Router();
const { authGuard } = require('../../services/middlewares')

const { getHoursForAllUsers } = require('../../models/report')


route.get('/tracked', authGuard, getHoursForAllUsers);


module.exports = route;