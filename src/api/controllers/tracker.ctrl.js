const route = require('express').Router();

const { trackActivity, trackSession } = require('../../models/employees')
const { getProjectsForApp } = require('../../models/master')

const { authGuard } = require('../../services/middlewares')

route.put('/activity', authGuard, trackActivity);
route.put('/session', authGuard, trackSession);
route.get('/projests', authGuard, getProjectsForApp);

module.exports = route;