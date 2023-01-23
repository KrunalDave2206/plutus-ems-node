const { body } = require("express-validator");
const { v4: uuid_v4 } = require('uuid');
const { DB } = require('../config');
const { successResponseWithData, unauthorizedResponse, ErrorResponse, successResponse } = require('../services/apiResponse')
const reqValidation = require('../services/reqValidation')
const { CURRENT_TIMESTAMP, PERMISSIONS } = require('../services/constants')

/* 
    API return all leave data with user information and filters with limit
*/
exports.getLeaves = async (req, res, next) => {

    let { size, page, from_date, to_date, emp_id, leave_status, all } = req.query
    let limit = size || 10;
    let offset = ((page || 1) - 1) * size;
    const logginUser = req.user;

    let whereCondition = [];



    if (emp_id && emp_id != '') whereCondition.push(` lm.emp_id = "${emp_id}" `);
    else if (all || logginUser.permissions.indexOf(PERMISSIONS.leaves_all) > -1) { }
    else if (all || logginUser.permissions.indexOf(PERMISSIONS.leaves_team) > -1)
        whereCondition.push(` (emp.reporting_employee_id ="${logginUser.id}")`);

    // if (emp_id && emp_id != '') whereCondition.push(' (lm.emp_id = "' + emp_id + ') ');
    if (leave_status && leave_status != '') whereCondition.push(' lm.leave_status = ' + leave_status + ' ');
    if (from_date && from_date != '' && to_date && to_date != '') whereCondition.push(' (lm.from_date >= "' + from_date + '" AND lm.from_date <= "' + to_date + '") ');

    let pagging = `LIMIT ${limit} OFFSET ${offset}`;

    let sql = `SELECT lm.*, 
        DATE_FORMAT(lm.from_date, '%Y-%m-%d') as from_date,
        DATE_FORMAT(lm.to_date, '%Y-%m-%d') as to_date,
        DATE_FORMAT(lm.created_at, '%Y-%m-%d') as added_date,        
        CONCAT(emp.first_name, ' ', emp.last_name) as emp_name,
        CONCAT(reportingEmp.first_name, ' ', reportingEmp.last_name) as reporting_manager,
        CONCAT(createdEmp.first_name, ' ', createdEmp.last_name) as created_by
    FROM
        leave_master lm
    LEFT JOIN employees emp ON lm.emp_id = emp.id
    LEFT JOIN employees createdEmp ON lm.created_by = createdEmp.id 
    LEFT JOIN employees reportingEmp ON emp.reporting_employee_id = reportingEmp.id  
    ${whereCondition.length > 0 ? 'WHERE ' + whereCondition.join('AND') : ''}
    ORDER BY lm.created_at DESC ${pagging}`;

    let sql1 = `SELECT count(lm.id) as leavesCount FROM leave_master lm
    LEFT JOIN employees emp ON lm.emp_id = emp.id ${whereCondition.length > 0 ? 'WHERE ' + whereCondition.join('AND') : ''}`;
   
    let [rows] = await DB.query(sql, []);
    console.log(rows);
    let [counts] = await DB.query(sql1);
     
    return successResponseWithData(res, '', { count: counts[0].leavesCount, rows });
}

/* 
    API for add leave data
*/
exports.addLeave = [
    body("emp_id").isLength({ min: 1 }).trim().withMessage("Employee id must be required."),
    body("leave_type").isLength({ min: 1 }).trim().withMessage("Leave type must be required."),
    body("day_type").isLength({ min: 1 }).trim().withMessage("Leave day must be required."),
    body("reason").isLength({ min: 1 }).trim().withMessage("Leave reason must be required."),
    body("from_date").isLength({ min: 1 }).trim().withMessage("From date must be required."),
    body("holidays").isLength({ min: 1 }).trim().withMessage("Holidays must be required."),
    body("total_days").isLength({ min: 1 }).trim().withMessage("Total days must be required."),
    reqValidation,
    async (req, res, next) => {
        try {
            let rLeave = { ...req.body };
            let leaveJson = {
                emp_id: rLeave.emp_id,
                leave_type: rLeave.leave_type,
                day_type: rLeave.day_type,
                reason: rLeave.reason,
                from_date: rLeave.from_date,
                to_date: (rLeave.day_type == 1) ? rLeave.from_date : rLeave.to_date,
                leaves: rLeave.leaves,
                holidays: rLeave.holidays,
                total_days: rLeave.total_days,
                half_day: rLeave.half_day,
                created_by: rLeave.created_by,
                updated_at: null
            }
            let sql, msg = '';
            if (!req.body.id) {
                leaveJson.id = uuid_v4();
                leaveJson.created_at = CURRENT_TIMESTAMP,
                    sql = 'INSERT INTO leave_master SET ?;';
                msg = 'Leave Added Successful';
            } else {
                leaveJson.updated_at = CURRENT_TIMESTAMP,
                    sql = 'UPDATE leave_master SET ? WHERE id = "' + req.body.id + '";';
                msg = 'Leave Updated Successful';
            }
            let [rows, fields] = await DB.query(sql, [leaveJson]);
            if (rows.affectedRows == 1) {
                return successResponse(res, msg);
            } else {
                return unauthorizedResponse(res, 'Leave do not exist.');
            }
        } catch (err) {
            return ErrorResponse(res, err);
        }
    }]

/* 
    API return single leave data for view purposes
*/
exports.getLeave = async (req, res, next) => {
    try {
        let sql = `
        SELECT *,
            DATE_FORMAT(leave_master.from_date, '%Y-%m-%d') as from_date,
            DATE_FORMAT(leave_master.to_date, '%Y-%m-%d') as to_date
        FROM 
            leave_master 
        WHERE id =  ?;`
        let [rows] = await DB.query(sql, [req.params.leave_id]);
        return successResponseWithData(res, '', rows[0]);
    } catch (err) {
        return ErrorResponse(res, err);
    }
}
/*
LeaveStatus : [ 0-pending, 1-accept, 2-reject, 3-cancel ]	 
*/
exports.updateLeaveStatus = [
    body("status").isLength({ min: 1 }).trim().withMessage("Status must be required."),
    body("id").isLength({ min: 1 }).trim().withMessage("ID must be required."),
    reqValidation,
    async (req, res, next) => {
        try {
            sql = 'UPDATE leave_master SET leave_status = "' + req.body.status + '" WHERE id = "' + req.body.id + '";';
            await DB.query(sql, []);
            return successResponse(res, 'Leave status updated successful');
        } catch (error) {
            return ErrorResponse(res, error);
        }
    }]

exports.getLeaveCount = [
    body("from_date").isLength({ min: 1 }).trim().withMessage("From date must be required."),
    body("to_date").isLength({ min: 1 }).trim().withMessage("To date must be required."),
    reqValidation
    , async (req, res, next) => {
        try {
            let diffInMs = new Date(req.body.to_date) - new Date(req.body.from_date)

            diffInMs = (diffInMs <= 0) ? 1 : diffInMs;
            var totalDays = parseInt(diffInMs / (1000 * 60 * 60 * 24) + 1);

            var totalWeekends = 0;
            var holidayCount = 0;
            var leavesDays = 0;
            if (totalDays >= 2) {
                let sql = 'SELECT *, DATE_FORMAT(holidays.date, "%Y-%m-%d") as holidayDate  FROM holidays WHERE holidays.date BETWEEN "' + req.body.from_date + '" AND "' + req.body.to_date + '";';
                let [rows] = await DB.query(sql, []);
                rows.forEach(rs => {
                    holidayCount = holidayCount + 1;
                });

                for (var i = new Date(req.body.from_date); i <= new Date(req.body.to_date); i.setDate(i.getDate() + 1)) {
                    if (i.getDay() == 0 || i.getDay() == 6) totalWeekends++;
                }
            }

            totalWeekends = parseInt(totalWeekends) + parseInt(holidayCount);
            if (totalDays != totalWeekends) {
                leavesDays = totalDays - totalWeekends;
            } else {
                totalDays = 0;
            }
            let response = { "totalDays": totalDays, "holiDays": totalWeekends, "leaveDays": leavesDays };
            return successResponseWithData(res, '', response);
        } catch (error) {
            return ErrorResponse(res, error);
        }
    }]
