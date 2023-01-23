const route = require('express').Router();

const { getLeaves, addLeave, getLeave, updateLeaveStatus, getLeaveCount } = require('../../models/leave')
const { authGuard, accessLeavesAction } = require('../../services/middlewares')

route.get('/', authGuard, getLeaves);
route.post('/', authGuard, addLeave);
route.get('/:leave_id', authGuard, getLeave);
route.put('/', authGuard, accessLeavesAction, updateLeaveStatus);
route.post('/getLeaveCount', authGuard, getLeaveCount);
module.exports = route;