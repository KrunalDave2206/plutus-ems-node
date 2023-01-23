const route = require('express').Router();

const { addUpdate, list, get, updateTeam, getByTaskPrefix } = require('../../models/projects')
const { taskList } = require('../../models/tasks')
const { authGuard, accessProjectsTeam, accessProjectsAdd } = require('../../services/middlewares')

route.post('/', authGuard, accessProjectsAdd, addUpdate);
route.put('/team', authGuard, accessProjectsTeam, updateTeam);
route.get('/', authGuard, list);
route.get('/:project_id', authGuard, get);
route.get('/task_prefix/:task_prefix', authGuard, getByTaskPrefix);
route.get('/:project_id/tasks', authGuard, taskList);

module.exports = route;