const { body, param } = require("express-validator");

const { successResponseWithData, unauthorizedResponse, ErrorResponse, successResponse } = require('../services/apiResponse')
const reqValidation = require('../services/reqValidation')
const { dbInsert, DB } = require('../services/db');
const { CURRENT_TIMESTAMP } = require('../services/constants')

exports.list = [
    async (req, res) => {
        try {
            let { size, page, search_key } = req.query
            let limit = size || 10;
            let offset = ((page || 1) - 1) * size;

            let pagging = `LIMIT ${limit} OFFSET ${offset}`;

            let sql = `SELECT 
                h.id, 
                h.name, 
                DATE_FORMAT	(h.date, '%Y-%m-%d') as date  
            FROM holidays h WHERE h.is_active = 1 AND h.date > NOW() ORDER BY date ${pagging};`;
            let [rows, fields] = await DB.query(sql, []);

            let count = `SELECT count(1) holidayCount FROM holidays WHERE date > NOW();`
            let [crows, cfields] = await DB.query(count, [req.user.id])

            return successResponseWithData(res, '', { holidays: rows, count: crows[0].holidayCount });
        } catch (error) {
            return ErrorResponse(res, error);
        }
    }
]

exports.addUpdate = [
    body("name").isLength({ min: 1 }).trim().withMessage("Name must be specified."),
    body("date").isLength({ min: 1 }).trim().withMessage("Name must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let rBody = { ...req.body };
            let holiday = { name: rBody.name, date: rBody.date, updated_at: CURRENT_TIMESTAMP, created_at: CURRENT_TIMESTAMP }
            let { rows, id } = await dbInsert('holidays', holiday, rBody.id || null);

            if (rows.affectedRows == 1) {
                return successResponse(res, 'Holiday added successful');
            } else {
                return unauthorizedResponse(res, 'Holiday do not exist.');
            }
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]