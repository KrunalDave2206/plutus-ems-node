const { body, param } = require("express-validator");
const { v4 } = require('uuid');

const { DB } = require('../config');
const { successResponseWithData, unauthorizedResponse, ErrorResponse, successResponse } = require('../services/apiResponse')
const reqValidation = require('../services/reqValidation')

const { CURRENT_TIMESTAMP } = require('../services/constants');


exports.list = [
    async (req, res) => {
        try {
            let sql = `SELECT
                v.id,
                v.vacancies,
                v.experiance,
                v.closed,
                v.profile_id,
                p.name AS profile_name
            FROM
                vacancies v
            INNER JOIN profiles p ON p.id = v.profile_id 
            WHERE
                v.vacancies != v.closed
            ORDER BY
                p.created_at DESC;`;
            let [rows, fields] = await DB.query(sql, []);

            return successResponseWithData(res, '', { vacancies: rows });
        } catch (error) {
            return ErrorResponse(res, error);
        }
    }
]

exports.addUpdate = [
    body("profile_id").isLength({ min: 1 }).trim().withMessage("Profile Identity must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let rVacancy = { ...req.body };
            let vacancy = {
                vacancies: rVacancy.vacancies,
                profile_id: rVacancy.profile_id,
                experiance: rVacancy.experiance,
                closed: rVacancy.closed
            }
            let sql = '';
            if (!req.body.id) {
                vacancy.id = v4();
                vacancy.created_at = CURRENT_TIMESTAMP;
                sql = 'INSERT INTO vacancies SET ?;';
            } else {
                vacancy.updated_at = CURRENT_TIMESTAMP;
                sql = 'UPDATE vacancies SET ? WHERE id = "' + rVacancy.id + '";';
            }

            let [rows, fields] = await DB.query(sql, [vacancy]);
            if (rows.affectedRows == 1) {
                return successResponse(res, 'Vacancy Added successful');
            } else {
                return unauthorizedResponse(res, 'Vacancy do not exist.');
            }
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]