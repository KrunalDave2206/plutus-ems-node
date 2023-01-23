const jwt = require("jsonwebtoken");
const { findUserById, checkActivityForUser } = require('../models/employees')
const { getComment } = require('../models/tasks')
const { unauthorizedResponse } = require('../services/apiResponse')
const { PERMISSIONS, PERMISSIONS_old } = require("./constants");
const secret = process.env.JWT_SECRET;

exports.authGuard = async (req, res, next) => {
    const token = req.body.token || req.query.token || req.headers["x-access-token"];
    if (!token) return unauthorizedResponse(res, 'Unauthorized request');
    try {
        const decoded = jwt.verify(token, secret);
        let user = await findUserById(decoded.user);
        user.permissions = user.permissions ? JSON.parse(user.permissions) : null;
        req.user = user;
    } catch (err) {
        console.log('err', err);
        return unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
    }
    return next();
}

exports.adminGuard = (req, res, next) => {
    if (req.user.role_name == 'Admin') return next();
    else return unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
}

exports.deleteCommentGuard = async (req, res, next) => {
    let comment = await getComment(req.params.comment_id);
    if (comment.employee_id == req.user.id) return next();
    else return unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
}

// Permision middlewares
exports.permisionUsers = async (req, res, next) => checkPermision(req, PERMISSIONS_old.user) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
exports.permisionProject = async (req, res, next) => checkPermision(req, PERMISSIONS_old.project) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
exports.permisionClient = async (req, res, next) => checkPermision(req, PERMISSIONS_old.client) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
exports.permisionLeave = async (req, res, next) => checkPermision(req, PERMISSIONS_old.leave) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
exports.permisionHoliday = async (req, res, next) => checkPermision(req, PERMISSIONS_old.holiday) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
exports.permisionVacancy = async (req, res, next) => checkPermision(req, PERMISSIONS_old.vacancies) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');


exports.accessUsersAll = async (req, res, next) => checkPermision(req, PERMISSIONS.users_all) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
exports.accessUsersAdd = async (req, res, next) => checkPermision(req, PERMISSIONS.users_add) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
exports.accessUsersTeam = async (req, res, next) => checkPermision(req, PERMISSIONS.users_team) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');

exports.accessProjectsAll = async (req, res, next) => checkPermision(req, PERMISSIONS.projects_all) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
exports.accessProjectsAdd = async (req, res, next) => checkPermision(req, PERMISSIONS.projects_add) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
exports.accessProjectsTeam = async (req, res, next) => (checkPermision(req, PERMISSIONS.projects_add) || checkPermision(req, PERMISSIONS.projects_team)) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');

exports.accessClientsAll = async (req, res, next) => checkPermision(req, PERMISSIONS.clients_all) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
exports.accessClientsAdd = async (req, res, next) => checkPermision(req, PERMISSIONS.clients_add) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');

exports.accessLeavesAll = async (req, res, next) => checkPermision(req, PERMISSIONS.leaves_all) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
exports.accessLeavesAdd = async (req, res, next) => checkPermision(req, PERMISSIONS.leaves_add) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
exports.accessLeavesTeam = async (req, res, next) => checkPermision(req, PERMISSIONS.leaves_team) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');
exports.accessLeavesAction = async (req, res, next) => checkPermision(req, PERMISSIONS.leaves_action) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');

exports.accessHRDept = async (req, res, next) => checkPermision(req, PERMISSIONS.hr_dept) ? next() : unauthorizedResponse(res, 'Unauthorized request, Contact your admin.');

const checkPermision = (req, permision) => req.user.permissions && req.user.permissions.indexOf(permision) > -1 ? true : false;