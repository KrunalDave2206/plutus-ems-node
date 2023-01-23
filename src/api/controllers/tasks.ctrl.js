const route = require('express').Router();

const { getTask, getTaskByNumber, addUpdateTask, addComment, deleteComment, listComments, getTaskHistory, addWorkLog, listWOrklogs } = require('../../models/tasks')
const { authGuard, deleteCommentGuard } = require('../../services/middlewares')

// route.get('/:project_id', authGuard, taskList);
route.post('/', authGuard, addUpdateTask);
route.get('/:task_id', authGuard, getTask);
route.get('/numb/:number', authGuard, getTaskByNumber);

route.get('/:task_id/comment', authGuard, listComments);
route.post('/:task_id/comment', authGuard, addComment);
route.delete('/comment/:comment_id', authGuard, deleteCommentGuard, deleteComment);

route.get('/:task_id/history', authGuard, getTaskHistory);
route.post('/:task_id/worklog', authGuard, addWorkLog);
route.get('/:task_id/worklog', authGuard, listWOrklogs);
module.exports = route;