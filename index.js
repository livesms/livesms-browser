let config = require('./config');
const fs = require("fs");
const low = require("lowdb");
const db = low('db.json');
const bodyParser = require("body-parser");
const moment = require("moment");
const app = require('express')();
const express = require('express');
const server = require('http').Server(app);
const io = require('socket.io')(server);
const firebase = require("firebase");
const base64 = require("base-64");

console.log("Trying to start server with config:", config.serverip + ":" + config.serverport);

server.listen(config.serverport, config.serverip, function () {
    console.log("Server running @ http://" + config.serverip + ":" + config.serverport);
});

let needToConfigure = false;
let fbconfig;

try {
    fbconfig = require("./fbconfig.json");
} catch (e) {
    needToConfigure = true;
}

let database;

try {
    firebase.initializeApp(fbconfig);
    database = firebase.database();
}
catch (e) {
    needToConfigure = true;
}

let receivedMessages;
let appQueue;

function pushContact(message) {
    let contacts = db.get('contacts')
        .value();

    let exists = false;
    for (let i = 0; i < contacts.length; i++) {
        if (contacts[i].phone === message.from) {
            exists = true;
            return true;
        }
    }

    if (!exists) {
        console.log("Contact not exists, add it !");
        let contact = {
            phone: message.from,
            name: message.contactName
        };
        db.get("contacts").push(contact).write();

        io.sockets.emit('newContact', contact);
    }
}

if (!needToConfigure) {

    receivedMessages = database.ref('serverqueue/');
    appQueue = database.ref('appqueue/');

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
                let message = val[property];
                console.log("Message received from the queue : ", message);

                //Check if no message found

                console.log("GET 3 : ", db.get('messages').filter(message.from).value());

                let convExists = db.get('messages').filter({from: message.from}).size().value();

                if (convExists === 0) {
                    db.get('messages').push({from: message.from, conv: []}).write();
                    console.log("Created array cause it didn't exists");
                }

                console.log("message from : ", message.from);

                //Push message to the database

                db.get('messages').filter({from: message.from}).get("[0].conv")
                    .push(message)
                    .write();

                //Push the contact if it doesn't exists
                pushContact(message);

                //Remove the message from the queue
                database.ref("serverqueue/" + property)
                    .remove();

                //Send the message to the browser
                io.sockets.emit('message', message);
            }
        }
    });

} else {
    console.log("You must configure this app before using it, go to XXX to proceed");
}

db.defaults({
    contacts: [],
    messages: []
}).write();

io.on('connection', function (socket) {
    console.log("Client joined");

    socket.emit("config", config);

    //When the server receive a new message sent from the browser
    socket.on('browserMessage', function (message) {
        console.log("Message received from browser : ", message);

        message.from = config.number;

        //Write message to database
        db.get('messages').filter({from : message.to}).get("[0].conv")
            .push(message)
            .write();

        //Send mesage to firebase for the mobile app
        appQueue.push(message);
        console.log("Message sent : ", message);
        //console.log("MESSAGE NOT SENT TO PHONE");

    });

    socket.on("getMessages", (from, fn) => {
        console.log("id = " + from);

        fn(db.get('messages').filter({from: from}).get("[0].conv").value());
    });

    socket.on("getContacts", (fn) => {
        fn(db.get('contacts')
            .value());
    });

});

/**
 * Website serving
 */

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
