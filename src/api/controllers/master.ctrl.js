const route = require('express').Router();

const { getDesignations, getRoles, getClients, getEmployees, getAllEmployees, dashCalendar, getProfiles } = require('../../models/master')
const { authGuard } = require('../../services/middlewares')

route.get('/roles', authGuard, getRoles);
route.get('/designations', authGuard, getDesignations);
route.get('/clients', authGuard, getClients);
route.get('/employees', authGuard, getEmployees);
route.get('/employees/all', authGuard, getAllEmployees);
route.get('/dash/calendar', authGuard, dashCalendar);
route.get('/profiles', authGuard, getProfiles);

module.exports = route;