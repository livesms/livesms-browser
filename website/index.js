/**
 * Created by Armaldio on 31/03/2017.
 */

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
	let time   = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
	return time;
}

let myNumber = "XXXXXXXXXX";
let url      = window.location.href;

let reg   = /^(https?|http)/;
let wsUrl = url.replace(reg, "ws").replace(/\/$/, "") + ":8000/";
console.log("wsurl = " + wsUrl);

let socket = io.connect(wsUrl);

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

	$.ajax(settings).done(function (response) {
		console.log(response);
		callback(JSON.parse(response));
	});
}

socket.on('message', function (data) {
	let who = "other";
	if (data.from === myNumber)
		who = "self";

	let contact_template = `
			<li class="${who}">
                <div class="avatar"><img src="http://i.imgur.com/DY6gND0.png" draggable="false"/></div>
                <div class="msg">
                    ${data.message}
                    <br>
                    <time>${timeConverter(data.timestamp)}</time>
                </div>
            </li>
			`;

	$("#message-list").append(contact_template);
});

$(function () {
	console.log("Ready");
	request(url.replace(/\/$/, "") + "/messages", function (response) {
		$.each(response, function (index, value) {

			let who = "other";
			if (value.from === myNumber)
				who = "self";

			let contact_template = `
			<li class="${who}">
                <div class="avatar"><img src="http://i.imgur.com/DY6gND0.png" draggable="false"/></div>
                <div class="msg">
                    ${value.message}
                    <br>
                    <time>${timeConverter(value.timestamp)}</time>
                </div>
            </li>
			`;

			$("#message-list").append(contact_template);

		});
	});
});