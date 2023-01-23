const { DB, dbInsert } = require('../services/db');
const { successResponseWithData, unauthorizedResponse, ErrorResponse, successResponse } = require('../services/apiResponse')
const reqValidation = require('../services/reqValidation')
const { CURRENT_TIMESTAMP, SQL_TRUE, SQL_FALSE, SQL_EMP_STATUS, PERMISSIONS } = require('../services/constants');
const {getLeaves} = require("../models/leave")

exports.getHoursForAllUsers = [
    async (req, res, next) => {
        try {
            let { query, user } = req;
            let date = new Date().toISOString().split('T')[0];
            if (query.date) date = query.date;

            let table = date.length == 9 ? date.slice(0, 6).split('-') : date.slice(0, 7).split('-');
            table[1] = parseInt(table[1]);
            table = table.join('_');
         

            let whereClause = '';
            if (user.permissions.indexOf(PERMISSIONS.timetrack_view_all) > 0 && (!query.all || query.all == 'true')) {
                whereClause = ``;
            }
            else if ((user.permissions.indexOf(PERMISSIONS.timetrack_view_all) > 0 && query.all && query.all == 'false')
                || user.permissions.indexOf(PERMISSIONS.timetrack_view_team) > 0) {
                whereClause = ` (e.reporting_employee_id = ? OR e.id = ?)`;
            }
            else if (user.permissions.indexOf(PERMISSIONS.timetrack_view_all) == -1) whereClause = ` e.id = ? `;

            let sql = `SELECT
                t.id,
                t.first_name,
                t.last_name,
                t.work_preference,
                SEC_TO_TIME(SUM(t.total_sec)) AS total,
                FLOOR((SUM(t.active_sec)*100)/SUM(t.total_sec)) AS activity,
                start_time
            FROM
                (
                SELECT
                    e.id,
                    e.first_name,
                    e.last_name,
                    e.work_preference,
                    ta.total_sec,
                    ta.active_sec,
                    DATE_FORMAT(ta.start_time, '%Y-%m-%d') AS start_time
                FROM
                    employees e
                LEFT JOIN tracker_${table}_activity ta ON
                    ta.emp_id = e.id
                ${whereClause ? 'WHERE ' + whereClause : ''}
                ) t
            GROUP BY t.id, t.start_time
            ORDER BY t.first_name;`

            let sql1 = `SELECT e.id,
            lm.leaves,
            lm.total_days,
            lm.from_date,
            lm.half_day
            FROM employees e 
            LEFT OUTER JOIN leave_master lm ON
            e.id = lm.emp_id WHERE lm.leaves=1 OR lm.total_days = 0.5`
            let [rows, fields] = await DB.query(sql, [req.user.id, req.user.id]);
            let [leave] = await DB.query(sql1)
            console.log(leave);
            return successResponseWithData(res, 'Data',{leave,rows});
        } catch (error) {
            console.error('error', error)
            return ErrorResponse(res, error);
        }
    }
]