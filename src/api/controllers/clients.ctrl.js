const route = require('express').Router();

const { list, get, addUpdate } = require('../../models/clients')
const { authGuard, accessClientsAll, accessClientsAdd } = require('../../services/middlewares')

route.get('/', authGuard, accessClientsAll, list);
route.get('/:client_id', authGuard, accessClientsAll, get);
route.post('/', authGuard, accessClientsAdd, addUpdate);

module.exports = route;