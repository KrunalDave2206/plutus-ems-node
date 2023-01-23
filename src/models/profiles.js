const { body, param } = require("express-validator");
const { v4 } = require('uuid');

const { DB } = require('../config');
const { successResponseWithData, unauthorizedResponse, ErrorResponse, successResponse } = require('../services/apiResponse')
const reqValidation = require('../services/reqValidation')

const { CURRENT_TIMESTAMP } = require('../services/constants');


exports.list = [
    async (req, res) => {
        try {
            let { size, page, name } = req.query
            let limit = size || 10;
            let offset = ((page || 1) - 1) * size;

            let pagging = `LIMIT ${limit} OFFSET ${offset}`;
            let where = [];
            if (name && name !== 'undefined') where.push(`p.name like '${name}%' `)

            let sql = `SELECT p.id, p.name FROM profiles p WHERE p.is_active = 1 ${where.length > 0 ? ' AND ' + where.join(' AND ') : ''} ORDER BY p.created_at DESC ${pagging};`;
            let [rows, fields] = await DB.query(sql, []);

            let count = `SELECT count(1) profileCount FROM profiles;`
            let [crows, cfields] = await DB.query(count, [req.user.id])

            return successResponseWithData(res, '', { profiles: rows, count: crows[0].profileCount });
        } catch (error) {
            return ErrorResponse(res, error);
        }
    }
]

exports.addUpdate = [
    body("name").isLength({ min: 1 }).trim().withMessage("Name must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let rprofile = { ...req.body };
            let profile = { name: rprofile.name, is_active: 1 }
            let sql = '';
            if (!req.body.id) {
                profile.id = v4();
                profile.created_at = CURRENT_TIMESTAMP;
                sql = 'INSERT INTO profiles SET ?;';
            } else {
                profile.updated_at = CURRENT_TIMESTAMP;
                sql = 'UPDATE profiles SET ? WHERE id = "' + req.body.id + '";';
            }

            let [rows, fields] = await DB.query(sql, [profile]);
            if (rows.affectedRows == 1) {
                return successResponse(res, 'Profile Added successful');
            } else {
                return unauthorizedResponse(res, 'Profile do not exist.');
            }
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]