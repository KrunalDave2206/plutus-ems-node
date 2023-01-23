const { validationResult } = require("express-validator");
const { validationErrorWithData } = require('../services/apiResponse')

module.exports = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
        return validationErrorWithData(res, "Validation Error.", errors.array());
    else next();
}