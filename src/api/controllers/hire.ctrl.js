const route = require('express').Router();

const { listQuestionTypes, addUpdateQuestionTypes, listQuestions, addUpdateQuestion, apply, nextQuestion, result } = require('../../models/hire')
const { authGuard, adminGuard, accessHRDept } = require('../../services/middlewares')


route.get('/question/types', authGuard, listQuestionTypes);
route.post('/question/types', authGuard, accessHRDept, addUpdateQuestionTypes);
route.post('/question/next/:candidate_id', nextQuestion);

route.get('/questions', authGuard, listQuestions);
route.post('/questions', authGuard, accessHRDept, addUpdateQuestion);
route.post('/apply', apply);

route.get('/result/:candidate_id', authGuard, result);

module.exports = route;