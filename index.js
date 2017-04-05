let config       = require('./config');
const fs         = require("fs");
const low        = require("lowdb");
const db         = low('db.json');
const bodyParser = require("body-parser");
const moment     = require("moment");
const app        = require('express')();
const express    = require('express');
const server     = require('http')
	.Server(app);
const io         = require('socket.io')(server);
const firebase   = require("firebase");
const base64     = require("base-64");

console.log("Trying to start server with config:", config.serverip + ":" + config.serverport);

server.listen(config.serverport, config.serverip, function () {
	console.log("Server running @ http://" + config.serverip + ":" + config.serverport);
});

let needToConfigure = false;

let fbconfig = require("./fbconfig.json");
let database;

try {
	firebase.initializeApp(fbconfig);
	database = firebase.database();
}
catch (e) {
	needToConfigure = true;
	console.log("You must configure this app before using it, go to XXX to proceed");
}

let receivedMessages;
let appQueue;

if (!needToConfigure) {

	receivedMessages = database.ref('serverqueue/');
	appQueue         = database.ref('appqueue/');

	/**
	 * On new incomming message from the phone
	 *
	 * Also triggers at start
	 */
	receivedMessages.on('value', function (snapshot) {
		let val = snapshot.val();

		//For each messages remaining in the queue
		for (let property in val) {
			if (val.hasOwnProperty(property)) {

				console.log("Message received from the queue : ", val[property]);

				//Push message to the database
				db.get('messages.' + val[property].phone)
				  .push(val[property])
				  .write();

				//Remove the message from the queue
				database.ref("serverqueue/" + property)
						.remove();

				//Send the message to the browser
				io.sockets.emit('message', val[property]);
			}
		}
	});

}

db.defaults({
	contacts: [],
	messages: []
})
  .write();

io.on('connection', function (socket) {
	console.log("Client joined");

	//When the server receive a new message sent from the browser
	socket.on('browserMessage', function (message) {
		console.log("Message received from browser : ", message);

		message.from = config.number;

		//Write message to database
		db.get('messages.' + message.to)
		  .push(message)
		  .write();

		//Send mesage to firebase for the mobile app
		appQueue.push(message);
		console.log("Message sent : ", message);
		//console.log("MESSAGE NOT SENT TO PHONE");

	});

});

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use("/style", express.static('website/style'));
app.use("/lib", express.static('website/lib'));
app.use("/js", express.static('website/js'));

app.get('/', function (req, res) {
	console.log(needToConfigure);
	if (needToConfigure)
		res.sendFile('index.html', {root: __dirname + "/website"});
	else
		res.redirect('/chat');

});

app.use("/chat", express.static('website/chat'));
app.get('/chat', function (req, res) {
	res.sendFile('index.html', {root: __dirname + "/website/chat"});
});

app.get('/api/config', function (req, res) {
	res.send('var config = ' + JSON.stringify(config));
});

app.get('/contacts', function (req, res) {
	res.end(JSON.stringify(db.get('contacts')
							 .value()));
});

app.get('/messages', function (req, res) {
	res.end(JSON.stringify(db.get('messages')
							 .value()));
});

app.get('/messages/:id', function (req, res) {
	let id = req.params.id;
	console.log("id = " + id + " = " + base64.decode(id));

	res.end(JSON.stringify(db.get('messages.' + base64.decode(id)).value()));
});