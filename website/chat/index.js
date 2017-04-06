/**
 * Created by Armaldio on 31/03/2017.
 */

/**
 * Pad num size 0 before num
 * @param num
 * @param size
 * @returns {string}
 */
function pad (num, size) {
	let s = num + "";
	while (s.length < size) s = "0" + s;
	return s;
}

/**
 * Convert timestamp to readable date
 * @param UNIX_timestamp
 * @returns {string}
 */
function timeConverter (UNIX_timestamp) {
	let a      = new Date(UNIX_timestamp * 1000);
	let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	let year   = a.getFullYear();
	let month  = months[a.getMonth()];
	let date   = a.getDate();
	let hour   = a.getHours();
	let min    = a.getMinutes();
	let sec    = a.getSeconds();
	return date + ' ' + month + ' ' + year + ' ' + pad(hour, 2) + ':' + pad(min, 2) + ':' + pad(sec, 2);
}

/**
 * Add a message to the chat
 * @param message
 * @param who
 */
function addMessageQuote (message, who) {
	let align_right = "";
	let float_right = "";
	let message_type = "other-message";

	if (who === "self") {
		align_right = "align-right";
		float_right = "float-right";
		message_type = "my-message";
	}

	let contact_template =
			`
				<li class="clearfix">
                    <div class="message-data ${align_right}">
                        <span class="message-data-time" >${timeConverter(message.timestamp)}</span> &nbsp; &nbsp;
                        <span class="message-data-name" >{{ contactname }}</span> <i class="fa fa-circle me"></i>

                    </div>
                    <div class="message ${message_type}  ${float_right}">
                        ${message.message}
                    </div>
                </li>
					 `;

	$("#chat-msgs").append(contact_template);
	$('.chat-history').animate({
		scrollTop: $("#chat-msgs")
			.height()
	}, 0);
}

Notification.requestPermission(function (status) {
	if (Notification.permission !== status) {
		Notification.permission = status;
	}
});

let connString = config.protocol + config.domain + ':' + config.clientport;

console.log("Websocket connection string:", connString, config.wsclientopts);

let socket = io.connect(connString, config.wsclientopts);

// Handle error event
socket.on('error', function (err) {
	console.log("Websocket 'error' event:", err);
});

// Handle connection event
socket.on('connect', function () {
	console.log("Websocket 'connected' event with params:", socket);
});

// Handle disconnect event
socket.on('disconnect', function () {
	console.log("Websocket 'disconnect' event");
});

/**
 * Basic json request
 * @param url
 * @param callback
 */
function request (url, callback) {
	let settings = {
		"async"      : true,
		"crossDomain": true,
		"url"        : url,
		"method"     : "GET",
		"headers"    : {
			"content-type": "application/json",
		},
	};

	$.ajax(settings)
	 .done(function (response) {
		 callback(JSON.parse(response));
	 });
}

socket.on('message', function (data) {
	console.log("Message received from server", data);
	let who = "other";
	if (data.from === config.phone)
		who = "self";

	let n = new Notification("Message from " + data.from, {body: data.message});
	addMessageQuote(data, who);
});

$(function () {
	console.log("Ready");

	request("//" + config.domain.replace(/\/$/, "") + ':' + config.clientport + "/messages/" + btoa(config.currentContact), function (response) {

		response.sort(function (a, b) {
			return a["timestamp"] > b["timestamp"];
		});

		$.each(response, function (index, value) {

			console.log("Current message : ", value);

			let who = "other";
			if (value.from === config.number)
				who = "self";

			addMessageQuote(value, who);

		});
	});

	request("//" + config.domain.replace(/\/$/, "") + ':' + config.clientport + "/contacts", function (response) {

		$.each(response, function (index, value) {

			if (value.contact === config.currentContact)
				$("#currentContact").text(value.name);

			$("#contacts")
				.append(`
						<li class="clearfix" data-user="${value.contact}">
            			    <img width="55px" src="http://i.imgur.com/DY6gND0.png" alt="avatar" />
            			    <div class="about">
            			        <div class="name">${value.name}</div>
            			        <div class="status">
            			            <i class="fa fa-circle online"></i> Last mssage : 
            			        </div>
            			    </div>
            			</li>           
    					`)
		});
	});

	$('#message-to-send')
		.keypress(function (e) {
			if (e.which == 13) {
				let message = {
					message  : $('#message-to-send').val(),
					timestamp: Date.now() + "",
					to       : config.currentContact
				};
				socket.emit('browserMessage', message);
				$("#message-to-send").val("");
				addMessageQuote(message, "self");

				return false;
			}
		});

	$("#send-button").on("click", () => {
		let message = {
			message  : $('#message-to-send').val(),
			timestamp: Date.now() + "",
			to       : config.currentContact
		};
		socket.emit('browserMessage', message);
		$("#message-to-send").val("");
		addMessageQuote(message, "self");

		return false;
	});
});