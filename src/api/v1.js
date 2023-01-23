const route = require('express').Router();

const emp = require('./controllers/employees.ctrl')
const master = require('./controllers/master.ctrl')
const project = require('./controllers/projects.ctrl')
const clients = require('./controllers/clients.ctrl')
const leave = require('./controllers/leave.ctrl')
const tasks = require('./controllers/tasks.ctrl')
const profiles = require('./controllers/profile.ctrl')
const vacancies = require('./controllers/vacancies.ctrl')
const candidates = require('./controllers/candidates.ctrl')
const holidays = require('./controllers/holidays.ctrl')
const hire = require('./controllers/hire.ctrl')
const track = require('./controllers/tracker.ctrl')
const report = require('./controllers/report.ctrl')

route.get('/', (req, res) => { res.send('Oops! Sorry, There is nothing here. Good luck.') })
route.use('/emp', emp);
route.use('/mas', master);
route.use('/projects', project);
route.use('/clients', clients);
route.use('/leave', leave);
route.use('/tasks', tasks);
route.use('/profiles', profiles);
route.use('/vacancies', vacancies);
route.use('/candidates', candidates);
route.use('/holidays', holidays);
route.use('/hire', hire);
route.use('/track', track);
route.use('/report', report);

module.exports = route;