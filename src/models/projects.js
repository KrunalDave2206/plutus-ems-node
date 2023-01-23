const { body, param } = require("express-validator");
const { v4 } = require('uuid');

const { successResponseWithData, unauthorizedResponse, ErrorResponse, successResponse } = require('../services/apiResponse')
const reqValidation = require('../services/reqValidation')

const { CURRENT_TIMESTAMP, PERMISSIONS } = require('../services/constants');
const { dbInsert, DB } = require("../services/db");

exports.list = [
    async (req, res) => {
        try {
            let { size, page, name, client_id, team } = req.query
            size = size == 'undefined' ? null : size;
            page = page == 'undefined' ? null : page;
            let limit = size || 20;
            let offset = ((page || 1) - 1) * size;

            let pagging = `LIMIT ${limit} OFFSET ${offset}`;

            let myProject = '';
            let where = [];
            let pm = ` OR p.project_manager = '${req.user.id}'`;

            if (req.user.permissions.indexOf(PERMISSIONS.projects_all) == -1)
                myProject = `INNER JOIN project_team pt1 ON pt1.project_id = p.id AND (pt1.employee_id = "${req.user.id}" ${pm})`;

            if (name && name !== 'undefined') where.push(`p.name like '${name}%' `)
            if (client_id && client_id !== 'undefined') where.push(`p.client_id = '${client_id}' `)
            if (team && team !== 'undefined') myProject += ` INNER JOIN project_team pt2 ON  pt2.project_id = p.id AND pt2.employee_id ='${team}' `

            let sql = `SELECT
                p.id,
                p.name,
                p.description ,
                p.details ,
                p.task_prefix ,
                p.hours_per_week,
                p.statuses,
                c.name AS client_name,
                c.client_contact,
                e.first_name AS project_manager_first_name,
                e.last_name  AS project_manager_last_name,
                ebde.first_name AS bde_first_name,
                ebde.last_name AS bde_last_name,
                COUNT(pt.id) AS team
            FROM
                projects p
            LEFT JOIN clients c ON c.id = p.client_id 
            LEFT JOIN project_team pt ON pt.project_id = p.id 
            LEFT JOIN employees e ON e.id = p.project_manager
            LEFT JOIN employees ebde ON ebde.id = p.project_bde ${myProject}
            WHERE
                p.is_active = 1 ${where.length > 0 ? ' AND (' + where.join(' AND ') + ')' :''} GROUP BY p.id ORDER BY p.created_at DESC ${pagging} ;`;

            let count = `SELECT
                    count(1) projectCount
                FROM
                    projects p
                LEFT JOIN clients c ON c.id = p.client_id 
                LEFT JOIN employees e ON e.id = p.project_manager
                LEFT JOIN employees ebde ON ebde.id = p.project_bde ${myProject}
                WHERE
                    p.is_active = 1 ${where.length > 0 ? ' AND (' + where.join(' AND ') + ')' :''} ;`;
            
            let [rows, fields] = await DB.query(sql, []);
            let [cRows, cFields] = await DB.query(count, []);
            return successResponseWithData(res, '', { projects: rows, count: cRows[0].projectCount });
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]
exports.get = [
    param("project_id").isLength({ min: 1 }).trim().withMessage("Project Identity must be specified."),
    async (req, res) => {
        try {
            let sql = `SELECT
                p.id,
                p.name,
                p.description ,
                p.details ,
                p.task_prefix ,
                p.hours_per_week,
                p.client_id,
                p.project_bde,
                p.project_manager,
                p.statuses
            FROM
                projects p
            WHERE
                p.id = ?`;
            let [rows, fields] = await DB.query(sql, [req.params.project_id]);
            let teamSql = 'SELECT pt.employee_id FROM project_team pt WHERE pt.project_id = ?;';
            let [tmrows, tmfields] = await DB.query(teamSql, [req.params.project_id]);
            return successResponseWithData(res, '', { project: rows[0], team: tmrows });
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]

exports.getByTaskPrefix = [
    param("task_prefix").isLength({ min: 1 }).trim().withMessage("Task prefix must be specified."),
    async (req, res) => {
        try {
            let sql = `SELECT
                p.id,
                p.name,
                p.description ,
                p.details ,
                p.task_prefix ,
                p.hours_per_week,
                p.client_id,
                p.project_bde,
                p.project_manager,
                p.statuses
            FROM
                projects p
            WHERE
                p.task_prefix = ?`;
            let [rows, fields] = await DB.query(sql, [req.params.task_prefix]);
            let teamSql = `SELECT
                    pt.employee_id,
                    e.first_name, e.last_name,
                    CONCAT(e.first_name , ' ', e.last_name) as emp_name
                FROM project_team pt
                LEFT JOIN employees e ON e.id = pt.employee_id
                WHERE pt.project_id = ?;`;
            let [tmrows, tmfields] = await DB.query(teamSql, [rows[0].id]);
            return successResponseWithData(res, '', { project: rows[0], team: tmrows });
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]

exports.addUpdate = [
    body("name").isLength({ min: 1 }).trim().withMessage("Name must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let rProject = { ...req.body };
            let project = {
                name: rProject.name,
                description: rProject.description,
                details: rProject.details,
                client_id: rProject.client_id,
                task_prefix: rProject.task_prefix,
                hours_per_week: rProject.hours_per_week || 0,
                project_manager: rProject.project_manager,
                project_bde: rProject.project_bde,
                statuses: rProject.statuses.join(','),
                updated_at: null
            }
            let sql = '';
            if (!req.body.id) {
                project.id = v4();
                project.created_at = CURRENT_TIMESTAMP;
                sql = 'INSERT INTO projects SET ?;';
            } else {
                project.updated_at = CURRENT_TIMESTAMP;
                sql = 'UPDATE projects SET ? WHERE id = "' + req.body.id + '";';
            }

            let [rows, fields] = await DB.query(sql, [project]);
            if (rows.affectedRows == 1) {
                if (req.body.team) insertTeam(project.id || req.body.id, req.body.team);
                else deleteTeam(project.id || req.body.id);
                return successResponse(res, 'Project Registration successful');
            } else {
                return unauthorizedResponse(res, 'Project do not exist.');
            }
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]

exports.updateTeam = [
    body("project_id").isLength({ min: 1 }).trim().withMessage("Project Id must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let rProject = { ...req.body };
            if (rProject.team) insertTeam(rProject.project_id, rProject.team);
            else deleteTeam(rProject.project_id);
            if (rProject.project_manager) {
                let project = {
                    project_manager: rProject.project_manager
                }
                await dbInsert('projects', project, rProject.project_id)
            }
            return successResponse(res, 'Project Registration successful');
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]

const insertTeam = async (project_id, teams) => {
    let values = [];
    for (let t of teams) { values.push([v4(), project_id, t, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP]) }
    if (values.length > 0) {
        await deleteTeam(project_id);
        let isql = 'INSERT INTO project_team (id, project_id, employee_id, created_at, updated_at) VALUES ?;';
        await DB.query(isql, [values]);
    }
}
const deleteTeam = async (project_id) => {
    let dsql = 'DELETE FROM project_team WHERE project_id = ?;';
    await DB.query(dsql, [project_id]);
}