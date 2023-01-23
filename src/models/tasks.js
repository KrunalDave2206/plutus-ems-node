const { body, param } = require("express-validator");
const { v4 } = require('uuid');

const { DB } = require('../config');
const { successResponseWithData, unauthorizedResponse, ErrorResponse, successResponse } = require('../services/apiResponse')
const reqValidation = require('../services/reqValidation')

const { CURRENT_TIMESTAMP } = require('../services/constants');

exports.taskList = [
    param("project_id").isLength({ min: 1 }).trim().withMessage("Project Identity must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let sql = `SELECT
                t.id,
                t.number,
                t.title,
                t.description,
                t.priority,
                t.task_status,
	            t.task_type,
                IFNULL(t.board,0) AS board,
                e.first_name,
                e.last_name,
                t.assigned,
                t.task_status
            FROM
                tasks t
            LEFT JOIN employees e ON e.id = t.assigned 
            WHERE
                t.project_id = ?`
            let [rows, fields] = await DB.query(sql, [req.params.project_id]);
            return successResponseWithData(res, '', rows);
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]

exports.getTask = [
    param("task_id").isLength({ min: 1 }).trim().withMessage("Task Identity must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let sql = `SELECT
                t.id,
                t.project_id,
                t.number,
                t.title,
                t.description,
                t.task_status,
	            t.task_type,
                e.first_name,
                e.last_name,
                t.assigned,
                t.priority,
                DATE_FORMAT(t.created_at,'%Y-%m-%d %h:%i') AS created_at
            FROM tasks t
            LEFT JOIN employees e ON e.id = t.assigned 
            WHERE t.id = ?`
            let [rows, fields] = await DB.query(sql, [req.params.task_id]);
            return successResponseWithData(res, '', rows);
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]

exports.getTaskByNumber = [
    param("number").isLength({ min: 1 }).trim().withMessage("Task Identity must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let sql = `SELECT
                t.id,
                t.project_id,
                t.number,
                t.title,
                t.description,
                t.task_status,
	            t.task_type,
                e.first_name,
                e.last_name,
                t.assigned,
                t.priority,
                DATE_FORMAT(t.created_at,'%Y-%m-%d %h:%i') AS created_at
            FROM tasks t
            LEFT JOIN employees e ON e.id = t.assigned 
            WHERE t.number = ?`
            let [rows, fields] = await DB.query(sql, [req.params.number]);
            return successResponseWithData(res, '', rows);
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]

exports.addUpdateTask = [
    body("title").isLength({ min: 1 }).trim().withMessage("Task Title must be specified."),
    body("project_id").isLength({ min: 1 }).trim().withMessage("Project Identity must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let inputTask = { ...req.body };

            let task = {};
            let history = {
                task_id: inputTask.id,
                type: inputTask.type,
                action: inputTask.action || 'change',
                old_value: '',
                new_value: ''
            };
            let sql = '';
            if (!req.body.id) {
                let tnumbsql = `SELECT count(*) as number FROM tasks t WHERE t.project_id = ?`;
                let tpsql = `SELECT task_prefix FROM projects p WHERE p.id = ?`;
                task = {
                    title: inputTask.title,
                    description: inputTask.description,
                    assigned: inputTask.asignee,
                    project_id: inputTask.project_id,
                    task_status: inputTask.task_status || 'todo',
                    priority: inputTask.priority || 'low',
                    board: inputTask.board || 0,
                    created_by: req.user.id,
                    updated_at: CURRENT_TIMESTAMP
                }
                let [nrows, nfields] = await DB.query(tnumbsql, [inputTask.project_id]);
                let [tprows, tpfields] = await DB.query(tpsql, [inputTask.project_id]);
                task.id = v4();
                task.created_at = CURRENT_TIMESTAMP;
                task.number = tprows[0].task_prefix + '_' + (nrows[0].number + 1)
                sql = 'INSERT INTO tasks SET ?;';
            } else {
                if (inputTask.type) {
                    let tdSql = `SELECT * FROM tasks t WHERE t.id = ?`;
                    let [tdrows, nfields] = await DB.query(tdSql, [inputTask.id]);

                    if (history.type == 'title') {
                        history.old_value = tdrows[0].title;
                        history.new_value = inputTask.title;
                        task.title = history.new_value;
                    } else if (history.type == 'description') {
                        history.old_value = tdrows[0].description;
                        history.new_value = inputTask.description;
                        task.description = history.new_value;
                    } else if (history.type == 'assigned') {
                        history.old_value = tdrows[0].assigned;
                        history.new_value = inputTask.assigned;
                        task.assigned = history.new_value;
                    } else if (history.type == 'status') {
                        history.old_value = tdrows[0].task_status;
                        history.new_value = inputTask.task_status;
                        task.task_status = history.new_value;
                    } else if (history.type == 'priority') {
                        history.old_value = tdrows[0].priority;
                        history.new_value = inputTask.priority;
                        task.priority = history.new_value;
                    } else if (history.type == 'board') {
                        history.old_value = tdrows[0].board == 0 ? '0' : '1';
                        history.new_value = inputTask.board == 0 ? '0' : '1';
                        task.board = history.new_value;
                    }
                }
                task.updated_at = CURRENT_TIMESTAMP;
                sql = 'UPDATE tasks SET ? WHERE id = "' + req.body.id + '";';
            }

            let [rows, fields] = await DB.query(sql, [task]);
            if (rows.affectedRows == 1) {
                successResponse(res, 'Task added / updated successful');
                history.id = v4();
                history.action_by = req.user.id;
                history.action_at = CURRENT_TIMESTAMP;
                await DB.query('INSERT INTO task_history SET ?;', [history]);
                return;
            } else {
                return unauthorizedResponse(res, 'Task do not exist.');
            }
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]

exports.addComment = [
    param("task_id").isLength({ min: 1 }).trim().withMessage("Task Identity must be specified."),
    body("comment").isLength({ min: 1 }).trim().withMessage("Comment must be specified."),
    body("employee_id").isLength({ min: 1 }).trim().withMessage("EMployee Identity must be specified."),
    reqValidation,
    async (req, res, next) => {
        let comment = {
            task_id: req.params.task_id,
            comment: req.body.comment,
            employee_id: req.body.employee_id
        }
        let sql = '';
        if (!req.body.id) {
            comment.id = v4();
            comment.created_at = CURRENT_TIMESTAMP;
            sql = 'INSERT INTO task_comments SET ?;';
        } else {
            comment.updated_at = CURRENT_TIMESTAMP;
            sql = 'UPDATE task_comments SET ? WHERE id = "' + req.body.id + '";';
        }

        let [rows, fields] = await DB.query(sql, [comment]);
        if (rows.affectedRows == 1) {
            return successResponse(res, 'Task Comment added / updated successful');
        } else {
            return unauthorizedResponse(res, 'Task do not exist.');
        }
    }
];

exports.deleteComment = [
    param("comment_id").isLength({ min: 1 }).trim().withMessage("Comment Identity must be specified."),
    reqValidation,
    async (req, res, next) => {
        let sql = 'DELETE FROM task_comments WHERE id = ?;';
        let [rows, fields] = await DB.query(sql, [req.params.comment_id]);
        if (rows.affectedRows == 1) {
            return successResponse(res, 'Task Comment added / updated successful');
        } else {
            return unauthorizedResponse(res, 'COmment do not exist.');
        }
    }
];

exports.listComments = [
    param("task_id").isLength({ min: 1 }).trim().withMessage("Task Identity must be specified."),
    reqValidation,
    async (req, res, next) => {
        let sql = `SELECT
            tc.id,
            tc.comment,
            tc.task_id,
            tc.employee_id,
            e.first_name,
            e.last_name,
            DATE_FORMAT(tc.created_at,'%Y-%m-%d %h:%i') AS created_at
        FROM
            task_comments tc
        INNER JOIN employees e ON
            e.id = tc.employee_id
        WHERE
            tc.task_id = ? ORDER BY tc.created_at DESC`;
        let [rows, fields] = await DB.query(sql, [req.params.task_id]);
        return successResponseWithData(res, '', rows);
    }
];

exports.getTaskHistory = [
    param("task_id").isLength({ min: 1 }).trim().withMessage("Task Identity must be specified."),
    reqValidation,
    async (req, res, next) => {
        let sql = `SELECT
            th.type,
            th.action,
            th.old_value,
            th.new_value,
            e.first_name,
            e.last_name,
            concat(e2.first_name, ' ', e2.last_name) AS 'old_assignee',
            concat(e3.first_name, ' ', e3.last_name) AS 'new_assignee',
            DATE_FORMAT(th.action_at ,'%Y-%m-%d %h:%i') AS created_at
        FROM
            task_history th
        INNER JOIN employees e ON e.id = th.action_by 
        LEFT JOIN employees e2 ON e2.id = th.old_value AND th.type = 'assigned'
        LEFT JOIN employees e3 ON e3.id = th.new_value AND th.type = 'assigned'
        WHERE
            th.task_id = ? ORDER BY th.action_at DESC;`;
        let [rows, fields] = await DB.query(sql, [req.params.task_id]);
        return successResponseWithData(res, '', rows);
    }
]

exports.addWorkLog = [
    param("task_id").isLength({ min: 1 }).trim().withMessage("Task Identity must be specified."),
    body("hours").isLength({ min: 1 }).trim().withMessage("Comment must be specified."),
    body("minutes").isLength({ min: 1 }).trim().withMessage("Comment must be specified."),
    body("employee_id").isLength({ min: 1 }).trim().withMessage("EMployee Identity must be specified."),
    body("log_date").isLength({ min: 1 }).trim().withMessage("Log date must be specified."),
    reqValidation,
    async (req, res, next) => {
        let worklog = {
            task_id: req.params.task_id,
            detail: req.body.detail,
            hours: req.body.hours,
            minutes: req.body.minutes,
            employee_id: req.body.employee_id,
            log_date: req.body.log_date
        }
        let sql = '';
        if (!req.body.id) {
            worklog.id = v4();
            worklog.created_at = CURRENT_TIMESTAMP;
            sql = 'INSERT INTO task_worklogs SET ?;';
        } else {
            worklog.updated_at = CURRENT_TIMESTAMP;
            sql = 'UPDATE task_worklogs SET ? WHERE id = "' + req.body.id + '";';
        }

        let [rows, fields] = await DB.query(sql, [worklog]);
        if (rows.affectedRows == 1) {
            return successResponse(res, 'Task work log added / updated successful');
        } else {
            return unauthorizedResponse(res, 'Task do not exist.');
        }
    }
];

exports.listWOrklogs = [
    param("task_id").isLength({ min: 1 }).trim().withMessage("Task Identity must be specified."),
    reqValidation,
    async (req, res, next) => {
        let sql = `SELECT
            tw.id,
            tw.detail,
            DATE_FORMAT(tw.log_date,'%Y-%m-%d') AS log_date,
            tw.hours,
            tw.minutes,
            concat(e.first_name, ' ', e.last_name) employee 
        FROM task_worklogs tw 
        INNER JOIN employees e ON e.id = tw.employee_id 
        WHERE tw.task_id = ? ORDER BY tw.log_date DESC`;
        let [rows, fields] = await DB.query(sql, [req.params.task_id]);
        return successResponseWithData(res, '', rows);
    }
];

exports.getComment = async (comment_id) => {
    let sql = `SELECT tc.id, tc.comment, tc.task_id, tc.employee_id FROM task_comments tc WHERE tc.id = ?`;
    let [rows, fields] = await DB.query(sql, [comment_id]);
    return rows;
};

// UPDATE tracker_app_verions SET active = 0 WHERE active = 1;

// INSERT INTO tracker_app_verions (os, download_link, version, created_at)
// VALUES ('linux','https://drive.google.com/uc?export=download&id=1dT8ENxwQH1ou-R34Nd4we-0O4ehXtLlr', 1.0.0, NOW()),
// ('mac','https://drive.google.com/uc?export=download&id=12OJHxB-P3ayEecaOVh7VifKSuV9HFq1u', 1.0.0, NOW()),
// ('win','https://drive.google.com/uc?export=download&id=1rIpof_lp8HychqqKm8LyY9HTRsJ4QD5j', 1.0.0, NOW())
exports.getLetestVersion = async (os) => {
    let sql = `SELECT tav.download_link FROM tracker_app_verions tav WHERE tav.os = ? AND tav.active = 1;`;
    let [rows, fields] = await DB.query(sql, [os]);
    return rows;
}