const fs         = require("fs");
const low        = require("lowdb");
const db         = low('db.json');
const bodyParser = require("body-parser");
const moment     = require("moment");
const app        = require('express')();
const express    = require('express');
const server     = require('http').Server(app);
const io         = require('socket.io')(server);

server.listen(8081);
console.log("Listening");

//http://stackoverflow.com/questions/8684772/having-a-service-receive-sms-messages
//http://stackoverflow.com/questions/19813707/android-receive-sms-even-if-app-is-closed

db.defaults({
	contacts: [],
	messages: []
}).write();

io.on('connection', function (socket) {
	console.log("Connected");
	/*
	 socket.on('my other event', function (data) {
	 console.log(data);
	 });
	 */
});
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static('website'));

app.get('/', function (req, res) {
	res.sendFile('index.html', {root: __dirname + "/website"});
});

app.get('/contacts', function (req, res) {
	res.end(JSON.stringify(db.get('contacts').value()));
});

app.get('/messages', function (req, res) {
	res.end(JSON.stringify(db.get('messages').value()));
});

app.post('/newMessage', function (req, res) {
	let message = {
		from     : req.body.contact,
		message  : req.body.message,
		timestamp: req.body.timestamp
	};

	db.get('messages').push(message).write();
	io.emit('message', message);
	res.end("ok");
});