const route = require('express').Router();

const { login, addUser, getUsers, getUser, 
    listWithProject, profile, deleteUser, allTimeTracked, 
    activityTracked, deleteActivityTracked, changePassword, 
    workFromPreference} = require('../../models/employees')
const { authGuard, accessUsersAdd } = require('../../services/middlewares')

route.post('/', authGuard, accessUsersAdd, addUser);
route.get('/', authGuard, getUsers);
route.get('/profile', authGuard, profile);
route.post('/login', login);
route.post('/change_password', authGuard, changePassword);
route.put('/work_preference', authGuard, workFromPreference);
route.get('/see/projects', authGuard, listWithProject);
route.get('/timetracked/all', authGuard, allTimeTracked);
route.get('/timetracked/:emp_id', authGuard, activityTracked);
route.delete('/timetracked/:act_id', authGuard, deleteActivityTracked);

route.get('/:user_id', authGuard, getUser);
route.put('/:user_id', authGuard, accessUsersAdd, deleteUser);


module.exports = route;