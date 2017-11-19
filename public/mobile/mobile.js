var socket = io();

//input
var cli = document.getElementById('cli');
var inputBox = document.getElementById('cli-text');

var input;

//windows
var chat = document.getElementById('chat');
var action = document.getElementById('action');
var progress = document.getElementById('progress');
var hack = document.getElementById('hack');

//states
var isHacking = false;
var isBeingHacked = false;
var isNearRelay = false;
var castingAction = false;
var progressAction = false;
var partner = null;

//get user
var user = getCookie("relay-username");
if (user == "") user = null;

//location
if ("geolocation" in navigator) {
	var watchID = navigator.geolocation.watchPosition(function(position) {
		var lat = position.coords.latitude;
		var lon = position.coords.longitude;
		//provideFeedback('lat:' + lat + ' lon:' + lon);
		socket.emit('user location', {user:user, lat:lat, lon:lon});
	});
} else provideFeedback('Geolocation is not supported by this browser.');

//on recieve profile data for UI
socket.on('profile data', function(data) {
	var originName = document.getElementById('relay');
	originName.innerHTML = 'relay: ' + data.name;
});

//on successful pair
socket.on('paired', function(data) {
	var originName = document.getElementById('origin');
	originName.innerHTML = 'origin: ' + data;
	partner = data;
});

//on successful disband
socket.on('disbanded', function(data) {
	var relayName = document.getElementById('origin');
	relayName.innerHTML = 'origin: ';
	partner = null;
});

//on recieve chat message
socket.on('chat message', function(data) {
	addMessage(data.user, data.message, false);
});

//on getting hacked
socket.on('hacked progress', function(data) {
	//
});

//on hacking
socket.on('hack progress', function(data) {
	//
});

//on recieve error
socket.on('err', function(data) {
	provideFeedback(data);
});

//input formatting
inputBox.onpaste = function(e) {
	e.preventDefault();
}

//input handling
function handleInput(e) {
	if (e.keyCode == 13) {
		e.preventDefault();
		inputBox.value = null;

		provideFeedback('');

		if (input.toLowerCase().startsWith("-disband")) {
			if (partner != null) socket.emit('disband', {user:user, relay:partner});
			else provideFeedback('cannot disband, must be paired');
		} else {
			if (partner != null) {
				var message = input.trim();
				socket.emit('chat', {user:user, message:message});
				addMessage(user, message, true);
			} else provideFeedback('no relay to send message to, must be paired');
		}
	}   
}

//get user info and arrange layout
window.addEventListener("DOMContentLoaded", function () {
	if (user) socket.emit('load profile data', {user:user, type:'relay'});

	hack.style.display = "none";
	action.style.display = "none";
	chat.style.height = "100%";

	loop();
});

//persistent updates: layout, dynamic interface
function loop() {
	input = inputBox.value;

	//interface
	//

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

//adds message to chat
function addMessage(user, message, isLocal) {
	var container = document.createElement('div');
	if (isLocal) container.className = 'message-local';
	else container.className = 'message-foreign';

	var u = document.createElement('span');
	u.className = 'message-user';

	var uText = document.createTextNode(user);
	u.append(uText);

	var m = document.createElement('span');
	message.className = 'message-text';

	var mText = document.createTextNode(message);
	m.append(mText);

	container.append(u);
	container.append(m);

	chat.append(container); 

	chat.scrollTop = chat.scrollHeight;
}

//sets placeholder attribute of input as feedback response
function provideFeedback(message) {
	inputBox.setAttribute('placeholder', message);
}