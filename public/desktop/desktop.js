var socket = io();

mapboxgl.accessToken = 'pk.eyJ1IjoidmVreHMiLCJhIjoiY2phM2Z1ajlxMnF6ajJ3bDdrc3EyYXdvOCJ9.O9I8sJ8B-qG0XrPhM9ZkCw';

var mapbox = new mapboxgl.Map({
container: 'mapbox',
style: 'mapbox://styles/vekxs/cja3h1tpx1o062sochn6tzjax',
attributionControl: false
});

//input
var cli = document.getElementById('cli');
var inputBox = document.getElementById('cli-text');
var queryFill = document.getElementById('query-fill');

var input;
var oldInput;

//bars
var bar = document.getElementById('bar');
var barOrigin = document.getElementById('bar-origin');
var barRelay = document.getElementById('bar-relay');
var barLocation = document.getElementById('bar-location');
var barSession = document.getElementById('bar-session');

//windows
var chat = document.getElementById('chat');
var action = document.getElementById('action');
var progress = document.getElementById('progress');
var hack = document.getElementById('hack');
var map = document.getElementById('map');

//states
var isHacking = false;
var isBeingHacked = false;
var isNearRelay = false;
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

var hackedNearFill = [
"-counterhack"
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

//on recieve location data
socket.on('location', function(data) {

	//create marker
	var m = document.createElement('div');
	m.className = 'marker';
	m.setAttribute('user', data.user);

	//check if other marker(s) for this user exist, and remove them before adding the new one
	var markers = document.getElementsByClassName('marker');
	for (var i = 0; i < markers.length; i++) {
		if (markers[i].getAttribute('user') == data.user) markers[i].parentNode.removeChild(markers[i]);
	}

	//add new marker
	new mapboxgl.Marker(m)
	.setLngLat([data.lon, data.lat])
	.addTo(mapbox);
});

//on recieve error
socket.on('err', function(data) {
	provideFeedback(data);
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
			} else provideFeedback('cannot pair with user, you are already paired');

		} else if (input.toLowerCase().startsWith("-disband")) {
			if (partner != null) socket.emit('disband', {user:user, relay:partner});
			else provideFeedback('cannot disband, must be paired');
			
		} else if (input.toLowerCase().startsWith("-hack")) {
			socket.emit('initiate hack', user);

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
	if (user) socket.emit('load profile data', {user:user, type:'origin'});

	hack.style.display = 'none';
	progress.style.display = 'none';
	action.style.display = 'none';
	chat.style.height = '100%';
	map.style.height = '100%';
	mapbox.style.height = '100%';
	mapbox.resize();

	loop();
});

//persistent updates: cli suggestions, layout, dynamic interface
function loop() {

	//suggestions
	input = inputBox.value;
	resizeInput();
	if (oldInput != input) {
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

	//layout
	var barsWidth = barOrigin.offsetWidth + barRelay.offsetWidth + barLocation.offsetWidth;
	var totalWidth = bar.offsetWidth;

	barSession.style.width = ((totalWidth - barsWidth) - (20 * 3) - 1) + 'px';

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

//resizes input to put query fills immediately next to input
function resizeInput() {
	var len;
	if (input.length == 0) len = "50%";
	else len = (input.length) * 8;
	inputBox.style.width = len;
}

//sets query fills to array of strings
function setQueryFill(fills) {
	var text = fills[0];
	for (var i = 1; i < fills.length; i++) {
		text += ' ' + fills[i];
	}
	queryFill.innerHTML = text;
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