const route = require('express').Router();

const { list, addUpdate } = require('../../models/holidays')
const { authGuard, permisionHoliday, accessHRDept } = require('../../services/middlewares')

route.get('/', authGuard, list);
route.post('/', authGuard, accessHRDept, addUpdate);

module.exports = route;