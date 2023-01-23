let fs = require("fs")
const { v4 } = require('uuid');
const { body, param, query } = require("express-validator");

const { dbInsert, DB } = require('../services/db');
const { successResponseWithData, unauthorizedResponse, ErrorResponse, successResponse } = require('../services/apiResponse')
const reqValidation = require('../services/reqValidation');
const { CURRENT_TIMESTAMP } = require('../services/constants')

exports.listQuestionTypes = [
    async (req, res) => {
        try {
            let sql = `SELECT
                hqt.id,
                hqt.type,
                hqt.weightage,
                count(hq.id) questions
            FROM
                hire_questions_types hqt 
            LEFT JOIN hire_questions hq ON hq.type_id = hqt.id
            GROUP BY hqt.id;`;
            let [rows, fields] = await DB.query(sql, []);

            return successResponseWithData(res, '', { types: rows });
        } catch (error) {
            return ErrorResponse(res, error);
        }
    }
]

exports.addUpdateQuestionTypes = [
    body("type").isLength({ min: 1 }).trim().withMessage("Type must be specified."),
    body("weightage").isLength({ min: 1 }).trim().withMessage("Weightage must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let rBody = { ...req.body };
            let type = { type: rBody.type, weightage: rBody.weightage };
            if (rBody.id) type.created_by = req.user.id;
            else type.updated_by = req.user.id;

            let { rows, id } = await dbInsert('hire_questions_types', type, rBody.id || null);
            if (rows.affectedRows == 1) {
                return successResponse(res, 'Type added successful');
            } else {
                return unauthorizedResponse(res, 'Type do not exist.');
            }
        } catch (error) {
            return ErrorResponse(res, error);
        }
    }
]

exports.listQuestions = [
    async (req, res) => {
        try {
            let { type, size, page } = req.query;

            let limit = size || 2;
            let offset = ((page || 1) - 1) * limit;

            let pagging = `LIMIT ${limit} OFFSET ${offset}`;

            let where = type && type !== "undefined" ? `WHERE hq.type_id = "${type}"` : '';

            let sql = `SELECT
                hq.id,
                hq.question,
                hq.answers,
                hq.correct_ans,
                hq.type_id,
                hqt.type
            FROM
                hire_questions hq
            INNER JOIN hire_questions_types hqt ON hqt.id = hq.type_id ${where} ${pagging}`;

            let [rows, fields] = await DB.query(sql, []);

            let count = `SELECT count(1) questionCount FROM hire_questions;`
            let [crows, cfields] = await DB.query(count, [])

            return successResponseWithData(res, '', { questions: rows, count: crows[0].questionCount });
        } catch (error) {
            return ErrorResponse(res, error);
        }
    }
]

exports.addUpdateQuestion = [
    body("question").isLength({ min: 1 }).trim().withMessage("Question must be specified."),
    body("answers").isLength({ min: 1 }).trim().withMessage("Answers must be specified."),
    body("correct_ans").isLength({ min: 1 }).trim().withMessage("Correct Answer must be specified."),
    body("type_id").isLength({ min: 1 }).trim().withMessage("Type must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let rBody = { ...req.body };
            let question = { question: rBody.question, answers: rBody.answers, correct_ans: rBody.correct_ans, type_id: rBody.type_id };
            if (rBody.id) question.created_by = req.user.id;
            else question.updated_by = req.user.id;

            let { rows, id } = await dbInsert('hire_questions', question, rBody.id || null);
            if (rows.affectedRows == 1) {
                return successResponse(res, 'Question added successful');
            } else {
                return unauthorizedResponse(res, 'Question do not exist.');
            }
        } catch (error) {
            return ErrorResponse(res, error);
        }
    }
]

exports.apply = [
    body("first_name").isLength({ min: 1 }).trim().withMessage("First Name must be specified."),
    body("last_name").isLength({ min: 1 }).trim().withMessage("Last Name must be specified."),
    // body("resume").isLength({ min: 1 }).trim().withMessage("Resume must be specified."),
    body("email").isLength({ min: 1 }).trim().withMessage("Email be specified."),
    // body("password").isLength({ min: 1 }).trim().withMessage("Password be specified."),
    reqValidation,
    async (req, res) => {
        return res.send('Registration is off');
        try {
            let rCandidate = { ...req.body };

            let candidate = {
                first_name: rCandidate.first_name,
                last_name: rCandidate.last_name,
                middle_name: rCandidate.middle_name,
                email: rCandidate.email,
                contact_number: rCandidate.contact_number,
                gender: rCandidate.gender,
                expected_ctc: rCandidate.expected_ctc,
                current_location: rCandidate.current_location,
                preferred_location: rCandidate.preferred_location,
                notes: rCandidate.extra_note,
                password: rCandidate.password,
                technology_of_interest: rCandidate.technology_of_interest
            }
            if (!rCandidate.id) candidate.id = v4();
            if (rCandidate.resume) {
                let b64 = rCandidate.resume.split(';base64,')[1];
                let ext = base64FileHeaderMapper(b64);
                candidate.resume = candidate.id + '.' + ext;
                fs.writeFile('resumes/' + candidate.resume, b64, 'base64', (err) => { console.log(err); });
            }

            let { rows, id } = await dbInsert('candidates', candidate, rCandidate.id || null);
            let candidate_id = id;
            await createPaperFOrCandidate(candidate_id);
            if (rows.affectedRows == 1) {
                successResponseWithData(res, 'Candidate added successful', { candidate_id, first_name: rCandidate.first_name, last_name: rCandidate.last_name });
            } else {
                return unauthorizedResponse(res, 'Candidate do not exist.');
            }
            let qualification = [];
            rCandidate.qualifications.forEach(qua => {
                qualification.push(`("${candidate_id}","${qua.course}","${qua.university}","${qua.year}","${qua.percentage}", NOW())`);
            });
            let inserQualification = `INSERT INTO candidate_qualification (candidate_id, course, university, passing_year, percentage, created_at) VALUES ${qualification.join(',')} ;`
            let [crows, cfields] = await DB.query(inserQualification, []);

        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]

const base64FileHeaderMapper = (fileBase64) => {

    // let b64 = fileBase64.split(';base64,')[1];
    let fileHeader = new Map();

    //get the first 3 char of base64
    fileHeader.set("/9j", "JPG")
    fileHeader.set("iVB", "PNG")
    fileHeader.set("Qk0", "BMP")
    fileHeader.set("SUk", "TIFF")
    fileHeader.set("JVB", "PDF")
    fileHeader.set("UEs", "docx")
    fileHeader.set("0M8", "doc")

    let res = ""

    fileHeader.forEach((v, k) => {
        if (k == fileBase64.substr(0, 3)) {
            res = v
        }
    })

    //if file is not supported
    if (res == "") {
        res = "unknown file"
    }

    //return map value
    return res;
}

const createPaperFOrCandidate = async (candidate_id) => {
    let sqlGetCategories = `SELECT hqt.id, hqt.weightage FROM hire_questions_types hqt;`;
    let [trows, tfields] = await DB.query(sqlGetCategories, []);
    for (let index = 0; index < trows.length; index++) {
        const type = trows[index];
        let sql = `INSERT INTO hire_candidate_answers (question_id, question, answers, correct_ans, answer_by ) SELECT
            hq.id,
            hq.question,
            hq.answers,
            hq.correct_ans,
            "${candidate_id}"
        FROM
            hire_questions hq
        WHERE
            hq.type_id = '${type.id}'
        ORDER BY
            RAND()
        LIMIT ${type.weightage};`
        let [crows, cfields] = await DB.query(sql, []);
    }
}

exports.nextQuestion = [
    // body("question_id").isLength({ min: 1 }).trim().withMessage("First Name must be specified."),
    // body("answer").isLength({ min: 1 }).trim().withMessage("Last Name must be specified."),
    param("candidate_id").isLength({ min: 1 }).trim().withMessage("Question must be specified."),
    reqValidation,
    async (req, res) => {
        return res.send('Registration is off');
        try {
            let { answer, question_id } = req.body;
            let { candidate_id } = req.params;
            if (question_id && answer) {
                let que_ans = { answer: answer, updated_at: CURRENT_TIMESTAMP }
                let sql = `UPDATE hire_candidate_answers SET ? WHERE answer_by = ? AND question_id = ?`
                let { rows, id } = await DB.query(sql, [que_ans, candidate_id, question_id]);
            }

            let sqlQue = `SELECT
                hca.question_id,
                hca.question,
                hca.answers
            FROM
                hire_candidate_answers hca
            WHERE
                ifnull(hca.answer, "") = ""
                AND hca.answer_by = "${candidate_id}"
            LIMIT 1;`
            let [qrows, qfields] = await DB.query(sqlQue, []);

            let countSql = `SELECT 
                SUM(if( ifnull(hca.answer,"") = "" ,0,1)) AS answers,
                count(1) AS questions,
                SUM(IF(hca.answer = hca.correct_ans, 1,0)) AS correct_answers
            FROM hire_candidate_answers hca
            WHERE hca.answer_by = ?;`
            let [qarows, qafields] = await DB.query(countSql, [candidate_id]);
            return successResponseWithData(res, 'Candidate added successful', { question: qrows[0], count: qarows[0] });
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]

exports.result = [
    param("candidate_id").isLength({ min: 1 }).trim().withMessage("Question must be specified."),
    reqValidation,
    async (req, res) => {
        try {
            let { candidate_id } = req.params;
            let sqlQue = `SELECT
                hca.question_id,
                hca.question,
                hca.answer,
                hca.answers,
                hca.correct_ans,
                hqt.type,
	            hq.type_id,
                DATE_FORMAT(hca.updated_at, '%Y-%m-%d %h:%i') as updated_at
            FROM
                hire_candidate_answers hca
            LEFT JOIN hire_questions hq ON hq.id = hca.question_id 
            LEFT JOIN hire_questions_types hqt ON hqt.id = hq.type_id
            WHERE hca.answer_by = ?;`
            let [qrows, qfields] = await DB.query(sqlQue, [candidate_id]);

            let sqlDetail = `SELECT c.*, DATE_FORMAT(c.created_at, '%Y-%m-%d %h:%i') as created_at FROM candidates c WHERE c.id = ?;`
            let [drows, dfields] = await DB.query(sqlDetail, [candidate_id]);

            let sqlQualifi = `SELECT * FROM candidate_qualification cq WHERE cq.candidate_id = ?;`

            let [cqrows, cqfields] = await DB.query(sqlQualifi, [candidate_id]);

            let interviewSql = `SELECT
                ci.round,
                ci.meeting_link,
                DATE_FORMAT	(ci.datetime, '%Y-%m-%d %h:%i') as datetime,
                ciee.interview_id,
                ciee.employee_id,
                ciee.feedback,
                CONCAT(e.first_name, ' ', e.last_name ) AS interviewee
            FROM
                candidate_interviews ci
            LEFT JOIN candidate_interviewee ciee ON ciee.interview_id = ci.id 
            INNER JOIN employees e ON e.id = ciee.employee_id 
            WHERE ci.candidate_id = ?;`

            let [itrows, itfields] = await DB.query(interviewSql, [candidate_id]);
            
            return successResponseWithData(res, 'Candidate detail.', { questions: qrows, detail: drows[0], qualification: cqrows, interview: itrows });
        } catch (error) {
            console.log('error', error);
            return ErrorResponse(res, error);
        }
    }
]