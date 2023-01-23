const route = require('express').Router();

const { list, addUpdate, get, scheduleInterview, getInterview, listInterview, addInterviewFeedback } = require('../../models/candidates')
const { authGuard, adminGuard, accessHRDept } = require('../../services/middlewares')

route.get('/interview/mylist', authGuard, accessHRDept, listInterview);
route.post('/interview', authGuard, accessHRDept, scheduleInterview);
route.post('/interview/feedback', authGuard, accessHRDept, addInterviewFeedback);
route.get('/interview/:candidate_id', authGuard, accessHRDept,  getInterview);

route.get('/', authGuard, accessHRDept, list);
route.post('/', authGuard, accessHRDept, adminGuard, addUpdate);
route.get('/:cadidate_id', authGuard, accessHRDept, get);


module.exports = route;