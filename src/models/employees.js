const jwt = require("jsonwebtoken");
const bcryptjs = require('bcryptjs');
const { body, param, query, checkSchema } = require("express-validator");
const { uuid } = require('uuidv4');
// const salt = bcryptjs.genSaltSync(10);
const { DB, dbInsert } = require('../services/db');
const { successResponseWithData, unauthorizedResponse, ErrorResponse, successResponse } = require('../services/apiResponse')
const reqValidation = require('../services/reqValidation')
const { CURRENT_TIMESTAMP, SQL_TRUE, SQL_FALSE, SQL_EMP_STATUS, PERMISSIONS } = require('../services/constants');

// console.log('salt', salt)
let salt = '$2a$10$RJhCpxAOzQtlWLekXY4zW.';
const findUserByEmail = async (email) => {
    const sql = `SELECT emp.password, emp.id, emp.first_name, emp.last_name, emp.email, emp.birth_date, emp.created_at, emp.updated_at, emp.username, r.id as role_id, r.name as role_name, d.id as designation_id, d.name as designation_name, emp.designation, emp.c_address, emp.p_address, emp.reporting_employee_id, emp.is_working, emp.is_active, emp.is_superuser, emp.personal_email, emp.reference_employee_id, emp.joining_date, emp.contact_primary, emp.contact_alternative, emp.contact_emergency, emp.machine_id, emp.aadhar_card_number, emp.account_status, emp.permissions FROM employees emp LEFT JOIN roles r on r.id = emp.role INNER JOIN designations d on d.id = emp.designation  WHERE emp.email = ? AND emp.is_active = 1;`;
    let [rows, fields] = await DB.query(sql, [email]);
    return rows;
}

const findUserById = async (id) => {
    const sql = 'SELECT emp.id, emp.first_name, emp.last_name, emp.email, emp.birth_date, emp.created_at, emp.updated_at, emp.username, r.id as role_id, r.name as role_name, d.id as designation_id, d.name as designation_name, emp.designation, emp.c_address, emp.p_address, emp.reporting_employee_id, emp.is_working, emp.is_active, emp.is_superuser, emp.personal_email, emp.reference_employee_id, emp.joining_date, emp.contact_primary, emp.contact_alternative, emp.contact_emergency, emp.machine_id, emp.aadhar_card_number, emp.account_status, emp.permissions FROM employees emp LEFT JOIN roles r on r.id = emp.role INNER JOIN designations d on d.id = emp.designation  WHERE emp.id =  ? AND emp.is_active = 1;';
    let [rows, fields] = await DB.query(sql, [id])
    if (rows.length == 0) return false;
    else return rows[0];
}

const getUserByEmpNo = async (emp_no) => {
    const sql = 'SELECT emp.id, emp.first_name, emp.last_name, emp.email, emp.birth_date, emp.created_at, emp.updated_at, emp.username, r.id as role_id, r.name as role_name, d.id as designation_id, d.name as designation_name, emp.designation, emp.c_address, emp.p_address, emp.reporting_employee_id, emp.is_working, emp.is_active, emp.is_superuser, emp.personal_email, emp.reference_employee_id, emp.joining_date, emp.contact_primary, emp.contact_alternative, emp.contact_emergency, emp.machine_id, emp.aadhar_card_number, emp.account_status, emp.permissions FROM employees emp LEFT JOIN roles r on r.id = emp.role INNER JOIN designations d on d.id = emp.designation  WHERE emp.emp_no =  ? AND emp.is_active = 1;';
    let [rows, fields] = await DB.query(sql, [emp_no])
    if (rows.length == 0) return false;
    else return rows[0];
}

const checkActivityForUser = async (user_id, act_id, date) => {
    // let table = date.slice(0, 7).replace('-', '_');
    let table = date.slice(0, 7).split('-');
    table[1] = parseInt(table[1]);
    table = table.join('_');
    const sql = `select count(1) from tracker_${table}_activity ta where ta.emp_id = ? and ta.id =?`;
    let [rows, fields] = await DB.query(sql, [user_id, act_id])
    return rows;
}
exports.checkActivityForUser = checkActivityForUser
exports.findUserById = findUserById;

exports.login = [
    body("email").isLength({ min: 1 }).trim().withMessage("Email must be specified.")
        .isEmail().withMessage("Email must be a valid email address."),
    body("password").isLength({ min: 1 }).trim().withMessage("Password must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let rows = await findUserByEmail(req.body.email)
            if (rows && rows.length) {
                let compared = await bcryptjs.compareSync(req.body.password, rows[0].password);
                if (compared) {
                    delete rows[0].password;
                    const jwtPayload = { user: rows[0].id };

                    //Generated JWT token with Payload and secret.
                    rows[0].token = jwt.sign(jwtPayload, process.env.JWT_SECRET);
                    return successResponseWithData(res, 'User Authentcation successful', rows[0]);
                } else
                    return unauthorizedResponse(res, 'User Authentcation failed');
            } else {
                return unauthorizedResponse(res, 'User do not exist.');
            }
        } catch (err) {
            return ErrorResponse(res, err);
        }
    }
];

exports.addUser = [
    body("email").isLength({ min: 1 }).trim().withMessage("Email must be specified.")
        .isEmail().withMessage("Email must be a valid email address.")
        .custom((value, { req }) => {
            return findUserByEmail(value.trim()).then(user => {
                if (user && user.length > 0) {
                    if (!req.body.id) {
                        return Promise.reject("E-mail already in use");
                    } else if (req.body.id && user[0].id != req.body.id) {
                        return Promise.reject("E-mail already in use");
                    }
                }
            })
        }),
    body("emp_no").custom(async (value, { req }) => {
        if (value) {
            let user = await getUserByEmpNo(value);
            if (user && user.id) {
                if (!req.body.id) {
                    return Promise.reject("Emp. No. already in use");
                } else if (req.body.id && user.id != req.body.id) {
                    return Promise.reject("Emp. No. already in use");
                }
            }
        }
    }),
    reqValidation,
    async (req, res) => {
        try {
            let rUser = { ...req.body };
            let user = {
                emp_no: rUser.emp_no,
                first_name: rUser.first_name ? rUser.first_name.trim() : rUser.first_name,
                last_name: rUser.last_name ? rUser.last_name.trim() : rUser.last_name,
                middle_name: rUser.middle_name ? rUser.middle_name.trim() : rUser.middle_name,
                email: rUser.email.trim(),
                gender: rUser.gender,
                personal_email: rUser.personal_email ? rUser.personal_email.trim() : rUser.personal_email,
                birth_date: rUser.birth_date,
                password: rUser.password,
                role: rUser.role,
                designation: rUser.designation,
                c_address: rUser.c_address ? rUser.c_address.trim() : rUser.c_address,
                p_address: rUser.p_address ? rUser.p_address.trim() : rUser.p_address,
                reporting_employee_id: rUser.reporting_employee_id,
                is_working: SQL_TRUE,
                is_active: SQL_TRUE,
                is_superuser: SQL_FALSE,
                reference_employee_id: rUser.reference_employee_id,
                joining_date: rUser.joining_date,
                contact_primary: rUser.contact_primary ? rUser.contact_primary.trim() : rUser.contact_primary,
                contact_alternative: rUser.contact_alternative ? rUser.contact_alternative.trim() : rUser.contact_alternative,
                contact_emergency: rUser.contact_emergency ? rUser.contact_emergency.trim() : rUser.contact_emergency,
                aadhar_card_number: rUser.aadhar_card_number ? rUser.aadhar_card_number.trim() : rUser.aadhar_card_number,
                account_status: SQL_EMP_STATUS[2],
                permissions: rUser.permissions ? JSON.stringify(rUser.permissions) : null,
                updated_at: null,
                bank_address: rUser.bank_address ? rUser.bank_address.trim() : rUser.bank_address,
                bank_account_number: rUser.bank_account_number ? rUser.bank_account_number.trim() : rUser.bank_account_number,
                pancard_number: rUser.pancard_number ? rUser.pancard_number.trim() : rUser.pancard_number,
                bank_name: rUser.bank_name ? rUser.bank_name.trim() : rUser.bank_name,
                experience_month: rUser.experience_month,
                experience_years: rUser.experience_years
            }
            if (rUser.id) delete user.password;
            else user.password = bcryptjs.hashSync(user.password || 'plutus@emp#1234', salt);
            let { rows, id } = await dbInsert('employees', user, rUser.id);

            if (rows.affectedRows == 1) return successResponse(res, 'User Registration successful');
            else return unauthorizedResponse(res, 'User do not exist.');
        } catch (err) {
            return ErrorResponse(res, err);
        }
    }
];

exports.getUsers = [
    async (req, res, next) => {
        let { size, page, search, block } = req.query
        let limit = size || 10;
        let offset = ((page || 1) - 1) * size;

        let searchClause = search ? ` CONCAT(emp.first_name, emp.last_name) like '%${search}%' ` : '';

        let pagging = `LIMIT ${limit} OFFSET ${offset}`;

        let sql = `SELECT
            emp.id,
            emp.emp_no,
            emp.first_name,
            emp.last_name,
            emp.email,
            r.name AS role_name,
            d.name AS designation_name,
            emp.reporting_employee_id,
            DATE_FORMAT	(emp.joining_date, '%Y-%m-%d') as joining_date,
            emp.contact_primary,
            emp.contact_alternative,
            emp.contact_emergency,
            emp.is_working
        FROM
            employees emp
        LEFT JOIN roles r ON
            r.id = emp.role
        LEFT JOIN designations d ON
            d.id = emp.designation`;
        let whereClause = ' emp.is_active = 1 ';
        whereClause += ' AND ' + (block == 'true' ? ' emp.is_working = 0 ' : ' emp.is_working = 1 ');
        if (req.user.permissions.indexOf(PERMISSIONS.users_all) == -1) whereClause += ' AND emp.reporting_employee_id = ? ';
        if (searchClause) whereClause += whereClause ? ' AND ' + searchClause : searchClause;

        let count = `SELECT count(1) userCount FROM employees emp ${whereClause ? 'WHERE ' + whereClause : ''};`

        whereClause += ` ${pagging}`

        let [rows, fields] = await DB.query(sql + ' WHERE ' + whereClause, [req.user.id])
        let [crows, cfields] = await DB.query(count, [req.user.id])
        return successResponseWithData(res, '', { users: rows, count: crows[0].userCount });
    }
]

exports.getUser = [
    param("user_id").isLength({ min: 1 }).trim().withMessage("User Identity must be specified."),
    reqValidation,
    async (req, res, next) => {
        try {
            let sql = `SELECT
                emp.id,
                emp.first_name,
                emp.last_name,
                emp.middle_name,
                emp.email,
                emp.gender,
                DATE_FORMAT	(emp.birth_date, '%Y-%m-%d') as birth_date,
                emp.username ,
                emp.role ,
                emp.designation ,
                emp.c_address ,
                emp.p_address ,
                emp.reporting_employee_id ,
                emp.personal_email ,
                emp.reference_employee_id ,
                DATE_FORMAT	(emp.joining_date, '%Y-%m-%d') as joining_date,
                emp.contact_primary ,
                emp.contact_alternative ,
                emp.contact_emergency ,
                emp.aadhar_card_number ,
                emp.account_status ,
                emp.emp_no,
                emp.permissions,
                emp.bank_address,
                emp.bank_account_number,
                emp.pancard_number,
                emp.bank_name,
                emp.experience_month,
                emp.experience_years
            FROM
                employees emp
            WHERE
                emp.id =  ?;`
            let [rows, fields] = await DB.query(sql, [req.params.user_id]);
            return successResponseWithData(res, '', rows[0]);
        } catch (err) {
            return ErrorResponse(res, err);
        }
    }
]

exports.deleteUser = [
    param("user_id").isLength({ min: 1 }).trim().withMessage("User Identity must be specified."),
    body("type").isIn(['active', 'working']).withMessage("Type must be specified."),
    body("value").isIn([0, 1]).withMessage("Value must be specified."),
    reqValidation,
    async (req, res, next) => {
        try {
            let { body, params } = req;
            let user = {};
            if (body.type == 'active') user.is_active = body.value;
            if (body.type == 'working') user.is_working = body.value;
            
            await dbInsert('employees', user, params.user_id);
            return successResponse(res, 'User Updated successful');
        } catch (error) {
            console.log('error', error)
            return ErrorResponse(res, error);
        }
    }
]

exports.listWithProject = [
    async (req, res, next) => {
        try {
            let sql = `SELECT
                concat(e.first_name , ' ', e.last_name) employee,
                p.name AS project_name,
                CONCAT(e2.first_name, ' ', e2.last_name ) project_manager 
            FROM
                employees e
            LEFT JOIN project_team pt ON
                pt.employee_id = e.id
            LEFT JOIN projects p ON
                p.id = pt.project_id
            LEFT JOIN employees e2 ON e2.id = p.project_manager 
            ORDER BY e.id;`
            let [rows, fields] = await DB.query(sql, []);
            return successResponseWithData(res, '', rows);
        } catch (error) {
            return ErrorResponse(res, err);
        }
    }
]

exports.profile = [
    async (req, res, next) => {
        try {
            let user_id = req.query.user_id || req.user.id;
            if (!user_id) return unauthorizedResponse(res, 'User do not exist.');
            let sql = `SELECT
                e.id,
                e.first_name,
                e.middle_name,
                e.last_name,
                e.gender,
                e.email,
                DATE_FORMAT	(e.birth_date, '%Y-%m-%d') as birth_date,
                d.name AS designation,
                e.c_address,
                e.p_address,
                concat(e2.first_name, ' ',e2.last_name) AS reporting_employee,
                DATE_FORMAT	(e.joining_date, '%Y-%m-%d') as joining_date,
                e.contact_primary,
                e.contact_alternative,
                e.emp_no,
                e.aadhar_card_number,
                e.account_status,
                e.work_preference
            FROM
                employees e
            INNER JOIN designations d ON d.id = e.designation
            LEFT JOIN employees e2 ON e2.id = e.reporting_employee_id 
            WHERE e.id = ?;`
            let [rows, fields] = await DB.query(sql, [user_id]);
            return successResponseWithData(res, '', rows[0]);
        } catch (error) {
            console.error('error', error)
            return ErrorResponse(res, error);
        }
    }
]

exports.trackActivity = [
    async (req, res, next) => {
        try {
            let { body } = req;
            if (body.activities && body.activities.length > 0) {
                const { tableName, imageTableName } = await getTimeTrackerTableName();

                let values = [];
                let images = [];
                let startDate = [];
                if (body.activities) {
                    for (const activity of body.activities) {
                        let id = uuid();
                        let start = new Date(activity.start).toISOString().slice(0, 19).replace('T', ' ');
                        let end = new Date(activity.end).toISOString().slice(0, 19).replace('T', ' ');
                        if (startDate.indexOf(start) == -1) {
                            startDate.push(start)
                            let event = { keyup: 0, mouseclick: 0, mousemove: 0, ...activity.event }
                            values.push([
                                id,
                                body.emp_id,
                                activity.project_id,
                                activity.total_sec,
                                activity.active_sec,
                                start,
                                end,
                                CURRENT_TIMESTAMP,
                                event.keyup,
                                event.mouseclick,
                                event.mousemove
                            ])
                            if (activity.image) images.push([id, activity.image])
                        }
                    }
                }
                let sql = `INSERT INTO ${tableName} (id, emp_id, project_id, total_sec, active_sec, start_time, end_time, created_at, keyup, mouseclick, mousemove) VALUES ? ;`
                await DB.query(sql, [values]);

                if (images.length) {
                    let sqlImage = `INSERT INTO ${imageTableName} (id, image) VALUES ?;`
                    DB.query(sqlImage, [images]);
                }
            }
            return successResponse(res, 'Time added successfully.')
        } catch (error) {
            console.error('error', error)
            return ErrorResponse(res, error);
        }
    }
]

const getTimeTrackerTableName = async () => {
    const dt = new Date()
    const year = dt.getFullYear();
    const month = dt.getMonth() + 1;
    // const date = dt.getDate();
    const tableName = `tracker_${year}_${month}_activity`;

    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (
      id char(36) NOT NULL,
      emp_id char(36) NOT NULL,
      project_id char(36) NOT NULL,
      total_sec int NOT NULL,      
      active_sec int NOT NULL,
      keyup INT NULL,
      mouseclick INT NULL,
      mousemove INT NULL,
      start_time datetime NULL,
      end_time datetime NULL,
      created_at datetime NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`;
    await DB.query(sql, []);

    const tableName1 = `tracker_${year}_${month}_activity__image`;
    const sql1 = `CREATE TABLE IF NOT EXISTS ${tableName1} (
        id char(36) NOT NULL ,
        image LONGTEXT NOT NULL,
        UNIQUE (id)  
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`;

    await DB.query(sql1, []);

    return { tableName, imageTableName: tableName1 };
}

exports.trackSession = [
    async (req, res, next) => {
        try {
            let { body } = req;
            if (body.sessions && body.sessions.length > 0) {
                const tableName = await getTimeSessionTableName();

                let values = [];
                if (body.activities) {
                    for (const session of body.sessions) {
                        let id = uuid();
                        let start = new Date(session.start_time).toISOString().slice(0, 19).replace('T', ' ');
                        let end = new Date(session.end_time).toISOString().slice(0, 19).replace('T', ' ');
                        values.push([id, body.emp_id, session.project_id, start, end, session.total_sec, CURRENT_TIMESTAMP])
                    }
                }
                if (values.length > 0) {
                    let sql = `INSERT INTO ${tableName} (id, emp_id, project_id, start_time, end_time, total_sec, created_at) VALUES ?;`
                    await DB.query(sql, [values]);
                }
            }
            return successResponse(res, 'Time added successfully.')
        } catch (error) {
            console.error('error', error)
            return ErrorResponse(res, error);
        }
    }
]

const getTimeSessionTableName = async () => {

    const dt = new Date()
    const year = dt.getFullYear();
    const month = dt.getMonth() + 1;
    // const date = dt.getDate();
    const tableName = `tracker_${year}_${month}_session`;

    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (
      id char(36) NOT NULL,
      emp_id char(36) NOT NULL,
      project_id char(36) NOT NULL,
      start_time datetime NOT NULL,
      end_time datetime NOT NULL,
      total_sec int NOT NULL,
      created_at datetime NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`;
    await DB.query(sql, []);

    return tableName;
}

exports.password = async (req, res, next) => {
    let pass = bcryptjs.hashSync(req.params.password.trim(), salt);
    let compared = await bcryptjs.compareSync(req.params.password, pass);
    res.send({ pass, compared });
}

exports.allTimeTracked = [
    async (req, res, next) => {
        try {
            let { query, user } = req;
            let date = new Date().toISOString().split('T')[0];
            if (query.date) date = query.date;

            let table = date.slice(0, 7).split('-');
            table[1] = parseInt(table[1]);
            table = table.join('_');

            let whereClause = '';
            if (user.permissions.indexOf(PERMISSIONS.timetrack_view_all) > 0 && query.all == 'true') {
                whereClause = ``;
            }
            else if ((user.permissions.indexOf(PERMISSIONS.timetrack_view_all) > 0 && query.all == 'false')
                || user.permissions.indexOf(PERMISSIONS.timetrack_view_team) > 0) {
                whereClause = ` AND (e.reporting_employee_id = ? OR e.id = ?)`;
            }
            else if (user.permissions.indexOf(PERMISSIONS.timetrack_view_all) == -1) whereClause = ` AND e.id = ? `;

            let sql = `SELECT
                ta.emp_id,
                e.work_preference AS work_from,
                CONCAT(e.first_name,' ', e.last_name) AS emp_name,
                SEC_TO_TIME(SUM(ta.total_sec)) AS total,
                SEC_TO_TIME(SUM(ta.active_sec)) AS active,
                FLOOR((SUM(ta.active_sec)*100)/SUM(ta.total_sec)) AS activity,
                FLOOR((SUM(IFNULL(ta.keyup,0))* 100)/ SUM(ta.total_sec)) AS key_activity,
	            FLOOR((SUM(IFNULL(ta.mouseclick,0))* 100)/ SUM(ta.total_sec)) AS click_activity,
	            FLOOR((SUM(IFNULL(ta.mousemove,0))* 100)/ SUM(ta.total_sec)) AS move_activity
            FROM
                tracker_${table}_activity ta
            INNER JOIN employees e ON e.id = ta.emp_id
            WHERE
                ta.start_time like '${date}%' ${whereClause}
            GROUP BY
                ta.emp_id ;`

            let [rows, fields] = await DB.query(sql, [req.user.id, req.user.id]);
            return successResponseWithData(res, 'User Authentcation successful', rows);
        } catch (error) {
            console.error('error', error)
            return ErrorResponse(res, error);
        }
    }
]

exports.activityTracked = [
    async (req, res, next) => {
        try {
            let { query, params } = req;
            let date = new Date().toISOString().split('T')[0];
            if (query.date) date = query.date;

            let table = date.slice(0, 7).split('-');
            table[1] = parseInt(table[1]);
            table = table.join('_');

            let sql = `SELECT
                ta.id,
                ta.emp_id,
                ta.start_time,
                ta.end_time,
                FLOOR((ta.keyup * 100)/ ta.total_sec) as keyup,
	            FLOOR((ta.mouseclick * 100)/ ta.total_sec) as mouseclick,
	            FLOOR((ta.mousemove * 100)/ ta.total_sec) as mousemove,
                p.name AS project_name,
                SEC_TO_TIME(ta.total_sec) as total,
                SEC_TO_TIME(ta.active_sec) as active,
                FLOOR((ta.active_sec * 100)/ ta.total_sec) as activity,
                tai.image 
            FROM
                tracker_${table}_activity ta
            LEFT JOIN tracker_${table}_activity__image tai on tai.id = ta.id 
            LEFT JOIN projects p on p.id = ta.project_id 
            WHERE
                ta.emp_id = ? and ta.start_time like '${date}%'
            ORDER BY ta.start_time desc;`

            let [rows, fields] = await DB.query(sql, [params.emp_id]);
            return successResponseWithData(res, 'Activity successful', rows);
        } catch (error) {
            console.error('error', error)
            return ErrorResponse(res, error);
        }
    }
]

exports.deleteActivityTracked = [
    param("act_id").isLength({ min: 1 }).trim().withMessage("Activity Identity must be specified."),
    query("date").isLength({ min: 1 }).trim().withMessage("Date must be specified."),
    async (req, res, next) => {
        try {
            let { query, params } = req;
            let exists = await checkActivityForUser(req.user.id, params.act_id, req.query.date);

            if (exists && exists.length == 0 && req.user.permissions && req.user.permissions.indexOf(PERMISSIONS.timetrack_delete) == -1) {
                return unauthorizedResponse(res, 'User is not Authorized!');
            }

            let date = new Date().toISOString().split('T')[0];
            if (query.date) date = query.date;

            let table = date.slice(0, 7).split('-');
            table[1] = parseInt(table[1]);
            table = table.join('_');

            let sql = `DELETE FROM tracker_${table}_activity WHERE id = ?;`;
            let sqlImage = `DELETE FROM tracker_${table}_activity__image WHERE id = ?;`;

            await DB.query(sql, [params.act_id]);
            await DB.query(sqlImage, [params.act_id]);

            return successResponse(res, 'Activity deleted successful');
        } catch (error) {
            console.error('error', error)
            return ErrorResponse(res, error);
        }
    }
]

exports.changePassword = [
    body("user_id").isLength({ min: 1 }).trim().withMessage("Activity Identity must be specified."),
    body("current_pass").isLength({ min: 1 }).trim().withMessage("Date must be specified."),
    body("new_pass").isLength({ min: 1 }).trim().withMessage("Date must be specified."),
    reqValidation,
    async (req, res, next) => {
        try {
            let { body, user } = req;
            
            if (user.id == body.user_id) {
                const sql = 'SELECT emp.id, emp.password FROM employees emp WHERE emp.id =  ? AND emp.is_active = 1;';
                let [rows, fields] = await DB.query(sql, [body.user_id])
                let dbUser = rows[0];

                if (dbUser && dbUser.id) {
                    let compared = await bcryptjs.compareSync(body.current_pass, dbUser.password);
                    if (compared) {
                        let password = bcryptjs.hashSync(body.new_pass, salt);
                        let { rows, id } = await dbInsert('employees', { password }, user.id);
                        if (rows.affectedRows == 1) return successResponse(res, 'User Registration successful');
                        else return unauthorizedResponse(res, 'User do not exist.');
                    } else
                        return unauthorizedResponse(res, 'User Authentcation failed');
                } else {
                    return unauthorizedResponse(res, 'User do not exist.');
                }
            }
            return unauthorizedResponse(res, 'User is not Authorized!');
        } catch (error) {
            console.error('error', error)
            return ErrorResponse(res, error);
        }
    }
]

const workFromPreferenceValidation = {
    "work_from": {
        in: 'body',
        matches: {
            options: [/\b(?:office|home)\b/],
            errorMessage: "Invalid preference"
        }
    }
}



exports.workFromPreference = [
    checkSchema(workFromPreferenceValidation),
    reqValidation,
    async (req, res, next) => {
        try {
            let { body, user } = req;
            await dbInsert('employees', { work_preference: body.work_from }, user.id);
            return successResponse(res, 'User Preference Updates successful');
        } catch (error) {
            console.error('error', error)
            return ErrorResponse(res, error);
        }
    }
];