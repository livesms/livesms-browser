const express = require('express');
const app     = module.exports = express();
const fs         = require("fs");
const low        = require("lowdb");
const db         = low('db.json');
const bodyParser = require("body-parser");
const moment     = require("moment");

db.defaults({
	contacts: [],
	messages: {}
}).write();

if (process.env.NODE_ENV !== 'production') {
	app.use(require('connect-livereload')({
		port  : 35729,
		ignore: ['.woff', '.flv', '.svg', '.js']
	}));
}

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
	res.sendFile('index.html', {root: __dirname + "/website"});
});

app.get('/contacts', function (req, res) {
	console.log(db.get('contacts').value());
});

app.get('/messages', function (req, res) {
	console.log(db.get('contacts').value());
});

app.post('/newMessage', function (req, res) {
	console.log(req.body.contact + " " + req.body.message);
	res.end("ok");
});

// start the server
if (!module.parent) {
	var port = 8081;
	app.listen(port);
	console.log("Express app started on port " + port);
}