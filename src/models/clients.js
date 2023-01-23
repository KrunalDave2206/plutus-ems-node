const { body, param } = require("express-validator");
const { v4 } = require('uuid');

const { DB } = require('../config');
const { successResponseWithData, unauthorizedResponse, ErrorResponse, successResponse } = require('../services/apiResponse')
const reqValidation = require('../services/reqValidation')
const { CURRENT_TIMESTAMP } = require('../services/constants');

exports.list = [
    async (req, res) => {
        try {
            let { size, page, search_key } = req.query
            let limit = size || 10;
            let offset = ((page || 1) - 1) * size;

            let pagging = `LIMIT ${limit} OFFSET ${offset}`;

            let sql = `SELECT c.id, c.name, c.client_contact, count(p.id) AS projects FROM clients c LEFT JOIN projects p ON p.client_id = c.id WHERE c.is_active = 1 GROUP BY c.id ${pagging};`;
            let [rows, fields] = await DB.query(sql, []);

            let count = `SELECT count(1) clientCount FROM clients;`
            let [crows, cfields] = await DB.query(count, [req.user.id])

            return successResponseWithData(res, '', { clients: rows, count: crows[0].clientCount });
        } catch (error) {
            return ErrorResponse(res, err);
        }
    }
]

exports.get = [
    param("client_id").isLength({ min: 1 }).trim().withMessage("Client Identity must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let sql = `SELECT c.id, c.name, c.client_contact  FROM clients c WHERE c.is_active = 1 AND c.id = ?;`;
            let [rows, fields] = await DB.query(sql, [req.params.client_id]);
            return successResponseWithData(res, '', rows[0]);
        } catch (error) {
            return ErrorResponse(res, err);
        }
    }
]

exports.addUpdate = [
    body("name").isLength({ min: 1 }).trim().withMessage("Name must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let rClient = { ...req.body };
            let client = {
                name: rClient.name,
                client_contact: rClient.client_contact
            }
            let sql = '';
            if (!req.body.id) {
                client.id = v4();
                client.created_at = CURRENT_TIMESTAMP;
                client.updated_at = CURRENT_TIMESTAMP;
                sql = 'INSERT INTO clients SET ?;';
            } else {
                client.updated_at = CURRENT_TIMESTAMP;
                sql = 'UPDATE clients SET ? WHERE id = "' + req.body.id + '";';
            }

            let [rows, fields] = await DB.query(sql, [client]);
            if (rows.affectedRows == 1) {
                return successResponse(res, 'Client Registration successful');
            } else {
                return unauthorizedResponse(res, 'Client do not exist.');
            }
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]