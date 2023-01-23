const { DB } = require('../config');
const { v4 } = require('uuid');
const { CURRENT_TIMESTAMP } = require('./constants');

exports.DB = DB;
exports.dbInsert = async (table, data, id = null) => {
    let sql = '';
    if (!id) {
        if (!data.id) data.id = v4();
        data.created_at = CURRENT_TIMESTAMP;
        sql = `INSERT INTO ${table} SET ?;`;
    } else {
        data.updated_at = CURRENT_TIMESTAMP;
        sql = `UPDATE ${table} SET ? WHERE id = ?;`;
    }

    let [rows, fields] = await DB.query(sql, [data, id]);
    return { rows, id: data.id };
}