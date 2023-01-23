const { body, param, query } = require("express-validator");
const { v4 } = require('uuid');

const { DB } = require('../config');
const { successResponseWithData, unauthorizedResponse, ErrorResponse, successResponse } = require('../services/apiResponse')
const reqValidation = require('../services/reqValidation')

const { CURRENT_TIMESTAMP } = require('../services/constants');

exports.list = [
    async (req, res) => {
        try {
            let { size, page, searchKey } = req.query
            let limit = size || 10;
            let offset = ((page || 1) - 1) * size;

            let pagging = `LIMIT ${limit} OFFSET ${offset}`;
            let where = searchKey && searchKey != 'null' ? ` WHERE CONCAT(c.first_name,' ',c.last_name) like '${searchKey}%' `:'';

            let sql = `SELECT
                c.id,
                c.first_name,
                c.last_name,
                c.middle_name,
                c.email,
                c.contact_number,
                c.gender,
                c.profile_id,
                DATE_FORMAT(c.created_at, '%Y-%m-%d') as created_at,
                DATE_FORMAT(c.updated_at, '%Y-%m-%d') as updated_at,
                p.name AS profile_name,
                SUM(IF(hca.correct_ans = hca.answer, 1,0)) AS answer,
	            SUM(IF(ci.id IS NULL, 0,1)) AS feedback
            FROM
                candidates c
            LEFT JOIN profiles p ON p.id = c.profile_id 
            LEFT JOIN hire_candidate_answers hca ON hca.answer_by = c.id 
            LEFT JOIN candidate_interviewee ci ON ci.employee_id = c.id ${where}
            GROUP BY c.id 
            ORDER BY c.created_at DESC ${pagging};`;
            let [rows, fields] = await DB.query(sql, []);

            let count = `SELECT count(1) candidateCount FROM candidates;`
            let [crows, cfields] = await DB.query(count, [])

            return successResponseWithData(res, '', { candidates: rows, count: crows[0].candidateCount });
        } catch (error) {
            return ErrorResponse(res, error);
        }
    }
]

exports.list2 = [
    async (req, res) => {
        try {
            let { size, page } = req.query
            let limit = size || 10;
            let offset = ((page || 1) - 1) * size;

            let pagging = `LIMIT ${limit} OFFSET ${offset}`;

            let sql = `SELECT
                c.first_name,
                c.last_name,
                c.middle_name,
                c.email,
                c.contact_number,
                c.alternate_contact_number,
                c.gender,
                c.marital_status,
                c.profile_id,
                c.resume,
                c.work_from,
                c.job_description,
                c.current_ctc,
                c.expected_ctc,
                c.current_location,
                c.preferred_location,
                c.total_experience,
                c.relevant_experience,
                c.source,
                c.communication,
                c.notes,
                c.notice_period,
                c.reason_for_change,
                c.hr,
                CONCAT(e.first_name,' ',e.last_name) hr_name,
                p.name AS profile_name
            FROM
                candidates c
            INNER JOIN profiles p ON p.id = c.profile_id 
            LEFT JOIN employees e ON e.id = c.hr 
            ORDER BY
                c.created_at DESC ${pagging};`;
            let [rows, fields] = await DB.query(sql, []);

            let count = `SELECT count(1) candidateCount FROM candidates;`
            let [crows, cfields] = await DB.query(count, [req.user.id])

            return successResponseWithData(res, '', { candidates: rows, count: crows[0].candidateCount });
        } catch (error) {
            return ErrorResponse(res, error);
        }
    }
]

exports.get = [
    param("cadidate_id").isLength({ min: 1 }).trim().withMessage("Client Identity must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let sql = `SELECT
                c.id,
                c.first_name,
                c.last_name,
                c.middle_name,
                c.email,
                c.contact_number,
                c.alternate_contact_number,
                c.gender,
                c.marital_status,
                c.profile_id,
                c.resume,
                c.work_from,
                c.job_description,
                c.current_ctc,
                c.expected_ctc,
                c.current_location,
                c.preferred_location,
                c.total_experience,
                c.relevant_experience,
                c.source,
                c.communication,
                c.notes,
                c.notice_period,
                c.reason_for_change,
                c.hr
            FROM
                candidates c WHERE c.id = ?`;
            let [rows, fields] = await DB.query(sql, [req.params.cadidate_id]);

            return successResponseWithData(res, '', { candidate: rows[0] });
        } catch (error) {
            return ErrorResponse(res, error);
        }
    }
]

exports.addUpdate = [
    body("profile_id").isLength({ min: 1 }).trim().withMessage("Profile Identity must be specified."),
    body("first_name").isLength({ min: 1 }).trim().withMessage("First Name must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let rCandidate = { ...req.body };
            let candidate = {
                first_name: rCandidate.first_name,
                last_name: rCandidate.last_name,
                middle_name: rCandidate.middle_name,
                email: rCandidate.email,
                contact_number: rCandidate.contact_number,
                alternate_contact_number: rCandidate.alternate_contact_number,
                gender: rCandidate.gender,
                marital_status: rCandidate.marital_status,
                profile_id: rCandidate.profile_id,
                resume: rCandidate.resume,
                work_from: rCandidate.work_from,
                job_description: rCandidate.job_description,
                current_ctc: rCandidate.current_ctc,
                expected_ctc: rCandidate.expected_ctc,
                current_location: rCandidate.current_location,
                preferred_location: rCandidate.preferred_location,
                total_experience: rCandidate.total_experience,
                relevant_experience: rCandidate.relevant_experience,
                source: rCandidate.source,
                communication: rCandidate.communication,
                notes: rCandidate.notes,
                notice_period: rCandidate.notice_period,
                reason_for_change: rCandidate.reason_for_change,
                hr: rCandidate.hr,
            }
            let sql = '';
            if (!req.body.id) {
                candidate.id = v4();
                candidate.created_at = CURRENT_TIMESTAMP;
                candidate.created_by = req.user.id
                sql = 'INSERT INTO candidates SET ?;';
            } else {
                candidate.updated_at = CURRENT_TIMESTAMP;
                candidate.updated_by = req.user.id
                sql = 'UPDATE candidates SET ? WHERE id = "' + rCandidate.id + '";';
            }

            let [rows, fields] = await DB.query(sql, [candidate]);
            if (rows.affectedRows == 1) {
                return successResponse(res, 'Candidate Added successful');
            } else {
                return unauthorizedResponse(res, 'Candidate do not exist.');
            }
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]

exports.scheduleInterview = [
    body("candidate_id").isLength({ min: 1 }).trim().withMessage("Candidate Identity must be specified."),
    body("round").isLength({ min: 1 }).trim().withMessage("Round must be specified."),
    body("datetime").isLength({ min: 1 }).trim().withMessage("Date Time must be specified."),
    body("meeting_link").isLength({ min: 1 }).trim().withMessage("Meeting Link must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let body = { ...req.body }
            let interview = {
                candidate_id: body.candidate_id,
                round: body.round,
                datetime: body.datetime,
                meeting_link: body.meeting_link
            }

            let sql = '';
            if (!body.id) {
                interview.id = v4();
                interview.created_at = CURRENT_TIMESTAMP;
                interview.created_by = req.user.id
                sql = 'INSERT INTO candidate_interviews SET ?;';
            } else {
                interview.updated_at = CURRENT_TIMESTAMP;
                interview.updated_by = req.user.id
                sql = `UPDATE candidate_interviews SET ? WHERE id = "${body.id}";`;
                let delInterviewee = `DELETE FROM candidate_interviewee WHERE interview_id = ?`
                let [derows, defields] = await DB.query(delInterviewee, [body.id]);
            }
            let [rows, fields] = await DB.query(sql, [interview]);
            console.log('rows', rows)
            let interviwee = [];
            for (let emp of body.interviwee) { interviwee.push([v4(), interview.id || body.id, emp]); }
            let sqlInterviwee = 'INSERT INTO candidate_interviewee (id, interview_id, employee_id) VALUES ?';
            let [erows, efields] = await DB.query(sqlInterviwee, [interviwee]);

            if (rows.affectedRows > 0) return successResponse(res, 'Interview Added successful');
            else return unauthorizedResponse(res, 'Interview do not exist.');
        } catch (error) {
            console.log('########################## scheduleInterview error ##########################\n\r', error);
            return ErrorResponse(res, error);
        }
    }
]

exports.getInterview = [
    param("candidate_id").isLength({ min: 1 }).trim().withMessage("Candidate Identity must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let sqlInterview = `SELECT
                ci.id,
                ci.round,
                ci.meeting_link,
                DATE_FORMAT(ci.datetime, '%Y-%m-%d %h:%i') as datetime
            FROM
                candidate_interviews ci
            WHERE
                ci.candidate_id = ? ORDER BY ci.created_at;`
            let [irows, ifields] = await DB.query(sqlInterview, [req.params.candidate_id]);

            let interviews = irows.map((inter, i) => inter.id);

            let sqlInterviewPanel = `SELECT
                ci.interview_id ,
                ci.employee_id ,
                ci.feedback,
                concat(e.first_name , ' ', e.last_name ) AS interviewee
            FROM
                candidate_interviewee ci
            INNER JOIN employees e ON e.id =ci.employee_id 
            WHERE
                ci.interview_id IN ("${interviews.join('","')}");`

            let [erows, efields] = await DB.query(sqlInterviewPanel, [req.params.candidate_id]);

            return successResponseWithData(res, 'Interview list here', { interviews: irows, panel: erows });
            // else return unauthorizedResponse(res, 'Interview do not exist.');
        } catch (error) {
            console.log('########################## scheduleInterview error ##########################\n\r', error);
            return ErrorResponse(res, error);
        }
    }
]


exports.listInterview = [
    query("date").isLength({ min: 1 }).trim().withMessage("Date must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let sql = `SELECT
                ci2.round,
                ci2.id ,
                ci2.meeting_link,
                c.first_name ,
                c.last_name ,
                p.name AS profile_name,
                DATE_FORMAT(ci2.datetime, '%Y-%m-%d %h:%i') as datetime
            FROM
                candidate_interviewee ci
            INNER JOIN candidate_interviews ci2 ON ci2.id = ci.interview_id
            INNER JOIN candidates c ON c.id = ci2.candidate_id
            LEFT JOIN profiles p ON p.id = c.profile_id 
            WHERE
                ci.employee_id = ? AND DATE_FORMAT(ci2.datetime, '%Y-%m') = ? ORDER BY ci2.datetime;`
        
            let [rows, fields] = await DB.query(sql, [req.user.id, req.query.date]);
            
            if (rows) return successResponseWithData(res, 'Interview list', { interviews: rows });
            else return unauthorizedResponse(res, 'Interview do not exist.');
        } catch (error) {
            console.log('########################## listInterview catch ##########################\n\r', error);
            return ErrorResponse(res, error);
        }
    }
]

exports.addInterviewFeedback = [

    body("interview_id").isLength({ min: 1 }).trim().withMessage("Interview Identity must be specified."),
    body("employee_id").isLength({ min: 1 }).trim().withMessage("Employee Identity must be specified."),
    body("feedback").isLength({ min: 1 }).trim().withMessage("Feedback must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            console.log("added0");
            let { body } = req;
            let feedback = { feedback: body.feedback };
            let sql = `UPDATE candidate_interviewee SET ? WHERE interview_id = ? AND employee_id = ?;`
            let [rows, fields] = await DB.query(sql, [feedback, body.interview_id, body.employee_id]);
   
            console.log(rows);
            if (rows.affectedRows > 0) return successResponse(res, 'Feedback Added successful');
            else return unauthorizedResponse(res, 'Interview do not exist.');
        } catch (error) {
            console.log('########################## addInterviewFeedback catch ##########################\n\r', error);
            return ErrorResponse(res, error);
        }
    }
]