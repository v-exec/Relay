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
var session = document.getElementById('session');
var topItem = document.getElementById('top-item');

//hack data
var hackName = document.getElementById('hack-name');
var hackProgress = document.getElementById('hack-progress');
var hackVisual = document.getElementById('hack-visual');

//states
var partner = null;
var target = null;
var hacker = null;

//get user
var user = getCookie("relay-username");
if (user == "") user = null;

//location
if ("geolocation" in navigator) {
	var watchID = navigator.geolocation.watchPosition(function(position) {
		var lat = position.coords.latitude;
		var lon = position.coords.longitude;
		socket.emit('user location', {user:user, lat:lat, lon:lon});
	});
} else provideFeedback('Geolocation is not supported by this browser.');

//on recieve profile data for UI
socket.on('profile data', function(data) {
	var originName = document.getElementById('relay');
	originName.innerHTML = 'relay: ' + data.name;
	session.innerHTML = 'public_session';
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

//on hack begin
socket.on('hack begin', function(data) {
	//resize layout
	hack.style.display = 'block';
	chat.style.height = '50%';

	//change UI text and get target/hacker
	if (data.role === 'hacker') {
		session.innerHTML = 'hacking_session';
		hacker = null;
		target = data.targetRelay;
		hackName.style.color = '#fff';
		hackProgress.style.color = '#fff';
		topItem.style.backgroundColor = '#fff';
		hackName.innerHTML = 'Hacking ' + data.targetOrigin + ' and ' + data.targetRelay + '.';
	} else if (data.role === 'target') {
		session.innerHTML = 'targeted_session';
		target = null;
		hacker = data.hackerRelay;
		hackName.style.color = '#ff0000';
		hackProgress.style.color = '#ff0000';
		topItem.style.backgroundColor = '#ff0000';
		hackName.innerHTML = 'Getting hacked by ' + data.hackerOrigin + ' and ' + data.hackerRelay + '.';
	}

	hackProgress.innerHTML = data.progress + '%';
});

//on hack progress
socket.on('hack progress', function(data) {
	hackProgress.innerHTML = data.progress + '%';

	var angle = map(data.progress, 0, 100, 0, Math.PI * 2);

	while (hackVisual.hasChildNodes()) {
		hackVisual.removeChild(hackVisual.lastChild);
	}

	var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute('width', '100%');
	svg.setAttribute('height', '100%');
	svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");

	var arcPath = createSvgArc(0, 0, 150, 0, angle);
	var color;
	if (data.role === 'hacker') color = '#fff';
	else if (data.role === 'target') color = '#ff0000';

	var xCenter = parseInt(hackVisual.offsetWidth) / 2;
	var yCenter = parseInt(hackVisual.offsetHeight) / 2;

	svg.innerHTML = '<svg x="' + (xCenter - 150) + 'px" y="' + (yCenter - 150) + 'px" width="300px" height="300px" viewBox="0 0 300 300"><g transform="translate(150 150) rotate(-90) scale(1 -1)"><path d="' + arcPath + '" fill="' + color + '"/></g></svg><circle cx="50%" cy="50%" r="110" fill="#111"/>';

	hackVisual.append(svg);
});

//on hack success
socket.on('hack success', function(data) {
	hackProgress.innerHTML = data.progress + '%';
	if (data.reason === 'hack') hackName.innerHTML = 'Successfully hacked ' + data.targetOrigin + ' and ' + data.targetRelay + '.';
	else if (data.reason === 'escape') hackName.innerHTML = 'Successfully escaped ' + data.targetOrigin + ' and ' + data.targetRelay + '.';
	else if (data.reason === 'counter') hackName.innerHTML = 'Successfully counter-hacked ' + data.hackerOrigin + ' and ' + data.hackerRelay + '.';
	
	target = null;
	hacker = null;

	setTimeout(function() {
		session.innerHTML = 'public_session';
		chat.style.height = '100%';
		hack.style.display = 'none';
		topItem.style.backgroundColor = '#fff';
	}, 5000);
});

//on hack failure
socket.on('hack failure', function(data) {
	hackProgress.innerHTML = data.progress + '%';
	if (data.reason === 'hack') hackName.innerHTML = 'Failure. Successfully hacked by ' + data.hackerOrigin + ' and ' + data.hackerRelay + '.';
	else if (data.reason === 'escape') hackName.innerHTML = 'Hack failed. ' + data.targetOrigin + ' and ' + data.targetRelay + ' have escaped.';
	else if (data.reason === 'counter') hackName.innerHTML = 'Hack failed. Successfully counter-hacked by ' + data.targetOrigin + ' and ' + data.targetRelay + '.';
	
	target = null;
	hacker = null;

	setTimeout(function() {
		session.innerHTML = 'public_session';
		chat.style.height = '100%';
		hack.style.display = 'none';
		topItem.style.backgroundColor = '#fff';
	}, 5000);
});

//on hack cancel
socket.on('hack cancel', function(data) {
	hackName.innerHTML = 'Hack was cancelled due to connection issue.';
	target = null;
	hacker = null;

	setTimeout(function() {
		session.innerHTML = 'public_session';
		chat.style.height = '100%';
		hack.style.display = 'none';
		topItem.style.backgroundColor = '#fff';
	}, 5000);
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

//creates arc using SVG
function createSvgArc(x, y, r, startAngle, endAngle) {
	if(startAngle > endAngle){
		var s = startAngle;
		startAngle = endAngle;
		endAngle = s;
	}

	if (endAngle - startAngle > Math.PI*2) endAngle = Math.PI*1.99999;

	if (endAngle - startAngle <= Math.PI) largeArc = 0;
	else largeArc = 1;

	var arc = [
		'M', x, y,
		'L', x + (Math.cos(startAngle) * r), y - (Math.sin(startAngle) * r), 
		'A', r, r, 0, largeArc, 0, x + (Math.cos(endAngle) * r), y - (Math.sin(endAngle) * r),
		'L', x, y
	];

	return arc.join(' ');
}

//linear map
function map(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}