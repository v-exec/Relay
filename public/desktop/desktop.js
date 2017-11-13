var socket = io();

var cli = document.getElementById('cli');
var inputBox = document.getElementById('cli-text');
var queryFill = document.getElementById('query-fill');

var input;
var oldInput;

var isHacking = false;
var castingAction = false;
var progressAction = false;
var partner = null;

var aloneFill = [
"-pair",
];

var pairedFill = [
"-disband"
];

var nearFill = [
"-disband",
"-hack"
];

var playerNameFill = [
"_relay name_"
];

var messageFill = [
"_message_"
];

//get user
var user = getCookie("relay-username");
if (user == "") user = null;

//get user info
if (user) {
	socket.emit('load profile data', user);
}

//on recieve profile data for UI
socket.on('profile data', function(data) {
	var originName = document.getElementById('origin');
	originName.innerHTML = 'origin: ' + data.name;
});

//on successful pair
socket.on('paired', function(data) {
	var relayName = document.getElementById('relay');
	relayName.innerHTML = 'relay: ' + data;
	partner = data;
});

//on successful disband
socket.on('disbanded', function(data) {
	var relayName = document.getElementById('relay');
	relayName.innerHTML = 'relay: ';
	partner = null;
});

//on recieve chat message
socket.on('chat', function(data) {
	//ADD TO CHAT
});

//on recieve error
socket.on('err', function(data) {
	inputBox.setAttribute('placeholder', data);
});

//input formatting
inputBox.onpaste = function(e) {
	e.preventDefault();
}

cli.onclick = function() {
	inputBox.focus();
}

//input handling
function handleInput(e) {
	if (e.keyCode == 13) {
		e.preventDefault();
		inputBox.value = null;

		inputBox.setAttribute('placeholder', '');

		if (input.toLowerCase().startsWith("-pair ")) {
			if (partner == null) {
				var targetUser = input.substring(6, input.length).trim();
				socket.emit('pair', {origin:user, relay:targetUser});
			} else inputBox.setAttribute('placeholder', 'cannot pair with user, you are already paired');

		} else if (input.toLowerCase().startsWith("-disband")) {
			if (partner != null) socket.emit('disband', {origin:user, relay:partner});
			else inputBox.setAttribute('placeholder', 'cannot disband, must be paired');
			
		} else if (input.toLowerCase().startsWith("-hack")) {
			socket.emit('initiate hack', user);

		} else {
			if (partner != null) {
				var message = input.trim();
				socket.emit('chat', {user:user, message:message});
			} else inputBox.setAttribute('placeholder', 'no relay to send message to, must be paired');
		}
	}   
}

window.addEventListener("DOMContentLoaded", function () {
	loop();
});

//persistent updates: cli suggestions and interface
function loop() {
	input = inputBox.value;

	resizeInput();

	if (oldInput == input) {

	} else {
		if (input == '' && partner == null) {
			setQueryFill(aloneFill);
		} else if (input == '' && partner != null) {
			setQueryFill(pairedFill);
		} else if (input == '-c ') {
			setQueryFill(messageFill);
		} else if (input == '-pair ') {
			setQueryFill(playerNameFill);
		} else queryFill.innerHTML = '';

		oldInput = input;
	}

	window.requestAnimationFrame(loop);
}

//helpers
function getCookie(cname) {
	var name = cname + "=";
	var decodedCookie = decodeURIComponent(document.cookie);
	var ca = decodedCookie.split(';');
	for(var i = 0; i <ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

function resizeInput() {
	var len;
	if (input.length == 0) len = "50%";
	else len = (input.length) * 8;
	inputBox.style.width = len;
}

function setQueryFill(fills) {
	var text = fills[0];
	for (var i = 1; i < fills.length; i++) {
		text += ' ' + fills[i];
	}
	queryFill.innerHTML = text;
}