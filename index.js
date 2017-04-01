const fs         = require("fs");
const low        = require("lowdb");
const db         = low('db.json');
const bodyParser = require("body-parser");
const moment     = require("moment");
const app        = require('express')();
const express    = require('express');
const server     = require('http').Server(app);
const io         = require('socket.io')(server);
const firebase   = require("firebase");

const server_port       = process.env.OPENSHIFT_NODEJS_PORT || 8081;
const server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

server.listen(server_port, server_ip_address);
console.log("Listening " + server_ip_address + ":" + server_port);

let fbconfig = require("./fbconfig.json");
firebase.initializeApp(fbconfig);
let database = firebase.database();

let receivedMessages = database.ref('serverqueue/');

receivedMessages.on('value', function (snapshot) {
	let val = snapshot.val();

	for (let property in val) {
		if (val.hasOwnProperty(property)) {

			console.log("Message : ", val[property]);
			db.get('messages').push(val[property]).write();
			firebase.database().ref("serverqueue/" + property).remove();

			io.sockets.emit('message', val[property]);
		}
	}
});

//http://stackoverflow.com/questions/8684772/having-a-service-receive-sms-messages
//http://stackoverflow.com/questions/19813707/android-receive-sms-even-if-app-is-closed

db.defaults({
	contacts: [],
	messages: []
}).write();

io.on('connection', function (socket) {
	console.log("Client joined");
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
		phone     : req.body.contact,
		message  : req.body.message,
		timestamp: req.body.timestamp
	};

	console.log("New message ", message);

	db.get('messages').push(message).write();
	io.broadcast.emit('message', message);
	res.end("ok");
});

/*
 app.get('/clear', function (req, res) {
 fs.unlink("db.json", function (err, res) {
 if (err) res.error("Unable to delete file");
 else {
 res.end("ok");
 }
 });
 });
 */