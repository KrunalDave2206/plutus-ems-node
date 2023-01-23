const { query } = require("express-validator");
const { DB } = require('../config');
const { successResponseWithData } = require('../services/apiResponse')

exports.getRoles = [
    async (req, res, next) => {
        let sql = `SELECT r.id, r.name FROM roles r WHERE r.is_active = 1;`
        let [rows, fields] = await DB.query(sql);
        return successResponseWithData(res, '', rows);
    }
];

exports.getDesignations = [
    async (req, res, next) => {
        let sql = `select d.id, d.name  from designations d  where d.is_active = 1;`
        let [rows, fields] = await DB.query(sql);
        return successResponseWithData(res, '', rows);
    }
];

exports.getClients = [
    async (req, res, next) => {
        let sql = 'SELECT c.id, c.name, c.client_contact  FROM clients c WHERE c.is_active = 1;';
        let [rows, fields] = await DB.query(sql);
        return successResponseWithData(res, '', rows);
    }
]

exports.getEmployees = [
    async (req, res, next) => {
        let whereClause = '';
        if (req.user.role_name !== 'Admin') whereClause = ' AND emp.reporting_employee_id = ?';
        let sql = `SELECT emp.id, CONCAT_WS(' ', emp.first_name, emp.last_name) as emp_name, emp.first_name, emp.last_name FROM employees emp WHERE emp.is_active = 1`;
        let [rows, fields] = await DB.query(sql, [req.user.id]);
        return successResponseWithData(res, '', rows);
    }
]

exports.getAllEmployees = [
    async (req, res, next) => {
        let sql = `SELECT emp.id, CONCAT_WS(' ', emp.first_name, emp.last_name) as emp_name, emp.first_name, emp.last_name FROM employees emp WHERE emp.is_active = 1 AND is_working = 1;`;
        let [rows, fields] = await DB.query(sql, [req.user.id]);
        return successResponseWithData(res, '', rows);
    }
]

exports.dashCalendar = [
    query("from_date").isLength({ min: 1 }).trim().withMessage("From Date must be specified."),
    query("to_date").isLength({ min: 1 }).trim().withMessage("To Date must be specified."),
    async (req, res, next) => {
        try {
            let sql = `SELECT 
                CONCAT(e.first_name ,' ',e.last_name) AS title,
                DATE_FORMAT(e.birth_date, '%Y-%m-%d') AS start,
                DATE_FORMAT(e.birth_date, '%Y-%m-%d') AS end,
                'birth_day' AS type
            FROM employees e 
            WHERE MONTH(e.birth_date) = MONTH('${req.query.from_date}')
            UNION
            SELECT
                CONCAT(e.first_name ,' ',e.last_name) AS title,
                DATE_FORMAT(lm.from_date, '%Y-%m-%d') AS start,
                CONCAT(DATE_FORMAT(lm.to_date, '%Y-%m-%d'), ' 23:59:59') AS end,
                'leaves' AS type
            FROM
                leave_master lm 
            INNER JOIN employees e ON lm.emp_id = e.id 
            WHERE
                (lm.from_date BETWEEN STR_TO_DATE('${req.query.from_date}','%Y-%m-%d') AND STR_TO_DATE('${req.query.to_date}','%Y-%m-%d')
                OR lm.to_date  BETWEEN STR_TO_DATE('${req.query.from_date}','%Y-%m-%d') AND STR_TO_DATE('${req.query.to_date}','%Y-%m-%d'))
                AND lm.leave_status IN (0,1)
            UNION
            SELECT
                h.name,
                DATE_FORMAT(h.date, '%Y-%m-%d') AS START, 
                DATE_FORMAT(h.date, '%Y-%m-%d') AS END,
                'holiday' AS TYPE
            FROM
                holidays h
            WHERE
                h.date BETWEEN STR_TO_DATE('${req.query.from_date}','%Y-%m-%d') AND STR_TO_DATE('${req.query.to_date}','%Y-%m-%d')`;
            
            let [rows, fields] = await DB.query(sql, []);
            return successResponseWithData(res, '', rows);
        } catch (error) {
            return ErrorResponse(res, err);
        }
    }
]

exports.getProfiles = [
    async (req, res, next) => {
        let sql = `SELECT p.id, p.name FROM profiles p WHERE p.is_active = 1 ORDER BY p.created_at DESC;`;
        let [rows, fields] = await DB.query(sql, []);
        return successResponseWithData(res, '', rows);
    }
]

exports.getProjectsForApp = [
    async (req, res) => {
        try {            
            let sql = `SELECT p.id, p.name FROM projects p LEFT JOIN employees ebde ON ebde.id = p.project_bde 
            INNER JOIN project_team pt ON pt.project_id = p.id AND pt.employee_id = "${req.user.id}"
            WHERE p.is_active = 1 GROUP BY p.id ORDER BY p.created_at DESC;`;

            let [rows, fields] = await DB.query(sql, []);
            return successResponseWithData(res, '', rows);
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]