require('dotenv').config();
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var morgan = require("morgan");
require("dotenv").config();
var indexRouter = require("./api/index");

var apiResponse = require("./services/apiResponse");
const { getLetestVersion } = require('./models/tasks')
var cors = require("cors");

var app = express();
//don't show the log when it is test

console.log('Environment', process.env.NODE_ENV);
morgan.format('myformat', '[:date[clf]] :method :url HTTP/:http-version Status: :status CL: :res[content-length]');
app.use(morgan('myformat'))
if (process.env.NODE_ENV !== "production") {
	app.use(cors());
}
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

let f = path.join(__dirname, "../resumes")
app.use('/resume', express.static(f));

app.set('view engine', 'html');
//app_builds
// let appBuilds = path.join(__dirname, "../app_builds")
app.get('/win-app-download', async (req, res) => {
	// const file = `${appBuilds}/Inside-win.exe`;
	// res.download(file); // Set disposition and send it.
	let vd = await getLetestVersion('win');
	res.redirect(vd[0].download_link)
});

app.get('/deb-app-download', async (req, res) => {
	// const file = `${appBuilds}/Inside-linux.deb`;
	// res.download(file); // Set disposition and send it.
	let vd = await getLetestVersion('linux');
	res.redirect(vd[0].download_link)
});

app.get('/dmg-app-download', async (req, res) => {
	// const file = `${appBuilds}/Inside.dmg`;
	// res.download(file); // Set disposition and send it.
	let vd = await getLetestVersion('mac');
	res.redirect(vd[0].download_link)
});

//To allow cross-origin requests
//Route Prefixes
app.use("/", indexRouter);

// throw 404 if URL not found
app.all("*", function (req, res) {
	return apiResponse.notFoundResponse(res, "Page not found");
});

app.use((err, req, res) => {
	if (err.name == "UnauthorizedError") {
		return apiResponse.unauthorizedResponse(res, err.message);
	}
});

module.exports = app;
