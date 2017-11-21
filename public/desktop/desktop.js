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

//hack data
var hackName = document.getElementById('hack-name');
var hackProgress = document.getElementById('hack-progress');
var hackText = document.getElementById('hack-text');
var hackTextInterval;

//states
var partner = null;
var target = null;
var hacker = null;

var aloneFill = [
"-pair",
];

var pairedFill = [
"-disband",
"-hack"
];

var hackedFill = [
"-counterhack"
];

var playerNameFill = [
"_relay name_"
];

var messageFill = [
"_message_"
];

var hackResponses = [
"tracing IP...",
"acquiring locative data...",
"switching TCP ports to UDP targeting...",
"[t_LINKSYS]",
"[############################] 100%",
"ACCESS DENIED",
"ACCESS GRANTED",
"-u admin -p root",
"installing backdoor...",
"decrypting...",
"loading jargon...",
"581-68218756616",
"5296963-2-522358327",
"5199606-36782958230925",
"8906815857121571235823",
"f929-23f23jf23-23-23",
"kkenmvkeioegmkiaaop01",
"fgi29490gk.239228",
"000000000000000000111000000000",
"111101011101101011010101010110",
"110100011101001110101010100101",
"110010000101101011010010011000",
"010100000001101010100010110110",
"//binary?",
"LOGIN: C:/Users/admin",
"01100111 01100101 01110100 00100000 01100110 01110101 01100011 01101011 01100101 01100100 00101100 00100000 01101011 01101001 01100100 01100100 01101111 00100001",
"01111001 01101111 01110101 00100000 01101010 01110101 01110011 01110100 00100000 01100111 01101111 01110100 00100000 01101000 01100001 01100011 01101011 01100101 01100100",
"01011001 01001111 01010101 00100000 01000011 01000001 01001110 01001110 01001111 01010100 00100000 01000101 01010011 01000011 01000001 01010000 01000101 00100000 01001000 01000001 01000011 01001011 01001110 01000101 01010100",
"01010010 01000101 01001011 01010100 00100000 01001100 01001111 01001100"
];

//get user
var user = getCookie("relay-username");
if (user == "") user = null;

//on recieve profile data for UI
socket.on('profile data', function(data) {
	var originName = document.getElementById('origin');
	originName.innerHTML = 'origin: ' + data.name;
	barSession.innerHTML = 'public_session';
	barLocation.innerHTML = 'no location';
});

//on successful pair
socket.on('paired', function(data) {
	var relayName = document.getElementById('relay');
	relayName.innerHTML = 'relay: ' + data;
	barLocation.innerHTML = 'no location';
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

//on hack begin
socket.on('hack begin', function(data) {
	//resize layout
	hack.style.display = 'block';
	map.style.height = 'calc(50% - 10px)';
	mapbox.style.height = '100%';
	mapbox.resize();

	while (hackText.hasChildNodes()) {
		hackText.removeChild(hackText.lastChild);
	}

	//change UI text and get target/hacker
	if (data.role === 'hacker') {
		addHackText();
		barSession.innerHTML = 'hacking_session';
		hacker = null;
		target = data.targetRelay;
		hackName.style.color = '#fff';
		hackProgress.style.color = '#fff';
		hackText.style.color = '#fff';
		hackName.innerHTML = 'Hacking ' + data.targetOrigin + ' and ' + data.targetRelay + '.';
	} else if (data.role === 'target') {
		addHackText();
		barSession.innerHTML = 'targeted_session';
		target = null;
		hacker = data.hackerRelay;
		hackName.style.color = '#ff0000';
		hackProgress.style.color = '#ff0000';
		hackText.style.color = '#ff0000';
		hackName.innerHTML = 'Getting hacked by ' + data.hackerOrigin + ' and ' + data.hackerRelay + '.';
	}

	hackProgress.innerHTML = data.progress + '%';
});

//on hack progress
socket.on('hack progress', function(data) {
	hackProgress.innerHTML = data.progress + '%';
});

//on hack success
socket.on('hack success', function(data) {
	hackProgress.innerHTML = data.progress + '%';
	if (data.reason === 'hack') hackName.innerHTML = 'Successfully hacked ' + data.targetOrigin + ' and ' + data.targetRelay + '.';
	else if (data.reason === 'escape') hackName.innerHTML = 'Successfully escaped ' + data.targetOrigin + ' and ' + data.targetRelay + '.';
	else if (data.reason === 'counter') hackName.innerHTML = 'Successfully counter-hacked ' + data.hackerOrigin + ' and ' + data.hackerRelay + '.';

	clearInterval(hackTextInterval);
	target = null;
	hacker = null;
	setTimeout(function() {
		barSession.innerHTML = 'public_session';
		hack.style.display = 'none';
		map.style.height = '100%';
		mapbox.style.height = '100%';
		mapbox.resize();
	}, 5000);
});

//on hack failure
socket.on('hack failure', function(data) {
	hackProgress.innerHTML = data.progress + '%';
	if (data.reason === 'hack') hackName.innerHTML = 'Failure. Successfully hacked by ' + data.hackerOrigin + ' and ' + data.hackerRelay + '.';
	else if (data.reason === 'escape') hackName.innerHTML = 'Hack failed. ' + data.targetOrigin + ' and ' + data.targetRelay + ' have escaped.';
	else if (data.reason === 'counter') hackName.innerHTML = 'Hack failed. Successfully counter-hacked by ' + data.targetOrigin + ' and ' + data.targetRelay + '.';

	clearInterval(hackTextInterval);
	target = null;
	hacker = null;
	setTimeout(function() {
		barSession.innerHTML = 'public_session';
		hack.style.display = 'none';
		map.style.height = '100%';
		mapbox.style.height = '100%';
		mapbox.resize();
	}, 5000);
});

//on hack cancel
socket.on('hack cancel', function(data) {
	hackName.innerHTML = 'Hack was cancelled due to connection issue.';
	clearInterval(hackTextInterval);
	target = null;
	hacker = null;
	setTimeout(function() {
		barSession.innerHTML = 'public_session';
		hack.style.display = 'none';
		map.style.height = '100%';
		mapbox.style.height = '100%';
		mapbox.resize();
	}, 5000);
});

//on recieve location data
socket.on('location', function(data) {
	//create marker
	var m = document.createElement('div');
	m.setAttribute('user', data.user);

	//if location is from target or partner, style appropriately and make reverse-geocoding request for partner's city
	if (data.user === partner) {
		m.className = 'partner-marker';
		readJSON('https://api.mapbox.com/v4/geocode/mapbox.places/'+ data.lon + ',' + data.lat + '.json?access_token=pk.eyJ1IjoidmVreHMiLCJhIjoiY2phM2Z1ajlxMnF6ajJ3bDdrc3EyYXdvOCJ9.O9I8sJ8B-qG0XrPhM9ZkCw', function(text) {
			var json = JSON.parse(text);
			barLocation.innerHTML = json.features[2].place_name;
		});
	} else if (data.user === target) {
		m.className = 'target-marker';
	} else {
		m.className = 'marker';
	}

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
			if (target != null || hacker != null) {
				provideFeedback('currently in hack, cannot disband');
			} else if (partner != null) {
				socket.emit('disband', {user:user, relay:partner});
				barLocation.innerHTML = 'no location';
			} else {
				provideFeedback('cannot disband, must be paired');
			}
			
		} else if (input.toLowerCase().startsWith("-hack")) {
			if (target == null && hacker == null) {
				socket.emit('initiate hack', user);
			} else {
				provideFeedback('cannot initiate hack, already engaged in hack')
			}

		} else if (input.toLowerCase().startsWith("-counterhack")) {
			if (hacker == null) {
				provideFeedback('cannot initiate counterhack, not being hacked');
			} else if (target != null) {
				provideFeedback('cannot initiate counterhack, already hacking');
			} else {
				socket.emit('counterhack', user);
			}
			
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
		} else if (input == '' && target != null) {
			queryFill.innerHTML = '';
		} else if (input == '' && hacker != null) {
			setQueryFill(hackedFill);
		} else if (input == '-pair ') {
			setQueryFill(playerNameFill);
		} else queryFill.innerHTML = '';
		oldInput = input;
	}

	//layout
	var barsWidth = barOrigin.offsetWidth + barRelay.offsetWidth + barLocation.offsetWidth;
	var totalWidth = bar.offsetWidth;
	barSession.style.width = ((totalWidth - barsWidth) - (20 * 3) - 1) + 'px';

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

//adds hack text
function addHackText() {
	hackTextInterval = setInterval(function(){
		var text = document.createElement('span');
		text.className = 'hack-text-content';

		if (Math.random() > 0.7) {
			hackText.append(document.createElement('br'));
		}

		var textContent = document.createTextNode(hackResponses[Math.floor(Math.random() * hackResponses.length)] + ' ');
		text.append(textContent);
		hackText.append(text);
		hackText.scrollTop = hackText.scrollHeight;
	}, 50);
}

//sets placeholder attribute of input as feedback response
function provideFeedback(message) {
	inputBox.setAttribute('placeholder', message);
}

//reads JSON file
function readJSON(file, callback) {
	var rawFile = new XMLHttpRequest();
	rawFile.overrideMimeType('application/json');
	rawFile.withCredentials = false;
	rawFile.open('GET', file, true);
	rawFile.onreadystatechange = function() {
		if (rawFile.readyState === 4 && rawFile.status == 200) {
			callback(rawFile.responseText);
		}
	}
	rawFile.send();
}