//references setup
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var net = require('net');
var bodyParser = require('body-parser');
var fs = require('fs');

//set 'public' as static directory
app.use(express.static('public'));

//server properties
var port = process.env.PORT || 3000;
var IP = process.env.IP || '0.0.0.0';

//set Express port
app.set('port', port);

//listen on port
server.listen(port, IP, function() {
	console.log('listening on ' + port);
});

//parses the text as URL encoded data and exposes the resulting object on req.body
app.use(bodyParser.urlencoded({
	extended: true
}));

//parses the text as JSON and exposes the resulting object on req.body
app.use(bodyParser.json());

//user-id pairs
global.origins = [];
global.relays = [];

//origin-relay pairs
global.originPairs = [];
global.relayPairs = [];

//ongoing hacks
global.hacks = [];

//on form recieve (for login) check users list for user, save profile to cookies, and send new page
//if user doesn't exist, add user
app.post("/", function (req, res) {
	var username = req.body.username;
	var password = req.body.password;
	var isOrigin = false;
	var userExists = false;
	var usersList = JSON.parse(fs.readFileSync('users.json', 'utf8'));

	if (req.body.login === "origin") isOrigin = true;

	//try to find user in existing profiles
	for (var i = 0; i < usersList.length; i++) {
		var user = usersList[i];

		if (user.name === username) {
			userExists = true;

			//check if user is online
			for (var j = 0; j < origins.length; j++) {
				if (origins[j].username === user.name) {
					res.sendFile(__dirname + '/public/index.html');
					return;
				}
			}

			for (var j = 0; j < relays.length; j++) {
				if (relays[j].username === user.name) {
					res.sendFile(__dirname + '/public/index.html');
					return;
				}
			}

			//if entered right password, send to appropriate page. else, refresh
			if (user.pass === password) {
				if (isOrigin) res.sendFile(__dirname + '/public/desktop/index.html');
				else res.sendFile(__dirname + '/public/mobile/index.html');
				return;
			} else {
				res.sendFile(__dirname + '/public/index.html');
				return;
			}
		}
	}

	//user doesn't exist, add user to profiles
	if (!userExists && password != "") {
		usersList.push({
			id: usersList.length,
			name: username,
			pass: password,
			level: 0,
			xp: 0
		});

		var json = JSON.stringify(usersList);
		fs.writeFile('users.json', json, 'utf8');

		if (isOrigin) res.sendFile(__dirname + '/public/desktop/index.html');
		else res.sendFile(__dirname + '/public/mobile/index.html');
		return;
	} else {
		res.sendFile(__dirname + '/public/index.html');
		return;
	}
});

//socket communication
io.on('connection', function(socket) {
	console.log('CONNECTION');
	//sends profile information to client when user signs in
	socket.on('load profile data', function(data) {
		var usersList = JSON.parse(fs.readFileSync('users.json', 'utf8'));

		//find user
		for (var i = 0; i < usersList.length; i++) {
			var user = usersList[i];

			//send user data
			if (user.name === data.user) {
				if (data.type === 'origin') {
					origins.push({id:socket.id, username:user.name});
				} else if (data.type === 'relay') {
					relays.push({id:socket.id, username:user.name, lat:0, lon:0});
				}
				
				socket.emit('profile data', user);
				printPlayers();
				return;
			}
		}
	});

	//removes user from users array
	socket.on('disconnect', function() {
		console.log('DISCONNECT');
		for (var i = 0; i < origins.length; i++) {
			if (origins[i].id === socket.id) {
				console.log(origins[i].username + ' has disconnected.');
				origins.splice(i, 1);
				return;
			}
		}

		for (var i = 0; i < relays.length; i++) {
			if (relays[i].id === socket.id) {
				console.log(relays[i].username + ' has disconnected.');
				relays.splice(i, 1);
				return;
			}
		}

	});

	//on receive location data from relay, save location and broadcast to all origins
	socket.on('user location', function(data) {
		console.log('LOCATION');
		for (var i = 0; i < relays.length; i++) {
			if (relays[i].username = data.user) {
				relays[i].lat = data.lat;
				relays[i].lon = data.lon;
			}
		}

		for (var i = 0; i < origins.length; i++) {
			socket.to(origins[i].id).emit('location', {user:data.user, lat:data.lat, lon:data.lon});
		}
	});

	//associates 2 players (one origin, one relay)
	socket.on('pair', function(data) {
		console.log('PAIR');
		for (var i = 0; i < relays.length; i++) {

			//find relay
			if (relays[i].username === data.relay) {

				//check if relay is already paired
				for (var j = 0; j < relayPairs.length; j++) {
					if (relayPairs[j].username === data.relay) {
						socket.emit('err', 'user is already paired');
						return;
					}
				}

				//find origin
				var originUser;

				for (var j = 0; j < origins.length; j++) {
					if (origins[j].username === data.origin) {
						originUser = origins[j];
					}
				}

				//pair
				originPairs.push(originUser);
				relayPairs.push(relays[i]);

				socket.emit('paired', data.relay);
				socket.to(relays[i].id).emit('paired', data.origin);
				return;
			}
		}

		//on unsuccessful pairing
		socket.emit('err', 'user is offline, or does not exist');
	});

	//on disband, disassociate pair
	socket.on('disband', function(data) {
		console.log('DISBAND');
		for (var i = 0; i < originPairs.length; i++) {
			if (originPairs[i].username === data.user) {
				socket.emit('disbanded', relayPairs[i].id);
				socket.to(relayPairs[i].id).emit('disbanded', originPairs[i].id);
				originPairs.splice(i, 1);
				relayPairs.splice(i, 1);
				return;
			} else if (relayPairs[i].username === data.user) {
				socket.to(originPairs[i].id).emit('disbanded', relayPairs[i].id);
				socket.emit('disbanded', originPairs[i].id);
				originPairs.splice(i, 1);
				relayPairs.splice(i, 1);
				return;
			}
		}
	});

	//on chat, send message to partner if they exist
	socket.on('chat', function(data) {
		console.log('CHAT');
		for (var i = 0; i < originPairs.length; i++) {
			if (originPairs[i].username === data.user) {
				socket.to(relayPairs[i].id).emit('chat message', {user:data.user, message:data.message});
				return;
			} else if (relayPairs[i].username === data.user) {
				socket.to(originPairs[i].id).emit('chat message', {user:data.user, message:data.message});
				return;
			}
		}
	});

	//on hack initiation, find origin's relay, check their distance from other relays, and then target other relay closest to them
	socket.on('initiate hack', function(user) {
		console.log('INITIATE HACK');
		for (var i = 0; i < originPairs.length; i++) {
			if (originPairs[i].username === user) {
				for (var j = 0; j < relayPairs.length; j++) {
					if (relayPairs[i] != relayPairs[j]) {

						//if distance between origin's relay and target is less than 0.1km, begin hack
						if(getDistance(relayPairs[i].lat, relayPairs[i].lon, relayPairs[j].lat, relayPairs[j].lon) < 0.1) {
							hacks.push({hackerIndex:i, hackeeIndex:j, progress: 0.0});
						}
					}
				}
			}
		}

		//if no target was found, emit 'no target found'
		socket.emit('err', 'could not find target near enough to relay');
	});

	//persistently emit progress ongoing hacks
	setInterval(function() {
		for (var i = 0; i < hacks.length; i++) {
			if (hacks[i].progress == 0) {
				socket.to(originPairs[hacks.hackerIndex].id).emit('hacking begin', hacks[i].progress);
				socket.to(relayPairs[hacks.hackerIndex].id).emit('hacking begin', hacks[i].progress);
				socket.to(originPairs[hacks.hackeeIndex].id).emit('hacked begin', hacks[i].progress);
				socket.to(relayPairs[hacks.hackeeIndex].id).emit('hacked begin', hacks[i].progress);
			} else if (hacks[i].progress < 100) {
				hacks[i].progress += 0.1;
				socket.to(originPairs[hacks.hackerIndex].id).emit('hacking progress', hacks[i].progress);
				socket.to(relayPairs[hacks.hackerIndex].id).emit('hacking progress', hacks[i].progress);
				socket.to(originPairs[hacks.hackeeIndex].id).emit('hacked progress', hacks[i].progress);
				socket.to(relayPairs[hacks.hackeeIndex].id).emit('hacked progress', hacks[i].progress);
			} else {
				socket.to(originPairs[hacks.hackerIndex].id).emit('hack success', hacks[i].progress);
				socket.to(relayPairs[hacks.hackerIndex].id).emit('hack success', hacks[i].progress);
				socket.to(originPairs[hacks.hackeeIndex].id).emit('hacked failure', hacks[i].progress);
				socket.to(relayPairs[hacks.hackeeIndex].id).emit('hacked failure', hacks[i].progress);
				hacks[i].splice(i, 1);
			}
		}
	}, 1000);
});

setInterval(function() {
	printPlayers();
}, 1000);

//gets distance between two coordinates on globe, in km
function getDistance(lat1,lon1,lat2,lon2) {
	//earth's radius in km
	var R = 6371;

	//format degrees to radians
	var dLat = deg2rad(lat2-lat1);
	var dLon = deg2rad(lon2-lon1);

	//Haversine formula
	var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
	var d = R * c;

	//distance in km
	return d;
}

//degree to radians
function deg2rad(deg) {
	return deg * (Math.PI/180);
}

//debugging
function printPlayers() {
	console.log("");
	console.log("/////////////////////// USERS ///////////////////////");
	console.log("");

	console.log("relays: " + relays.length);
	for (var i = 0; i < relays.length; i++) {
		console.log("relay " + i + ": " + relays[i].username);
	}

	console.log("");

	console.log("origins: " + origins.length);
	for (var i = 0; i < origins.length; i++) {
		console.log("origin " + i + ": " + origins[i].username);
	}

	console.log("");

	console.log("origin pairs: " + originPairs.length);
	console.log("relay pairs: " + relayPairs.length);
	for (var i = 0; i < originPairs.length; i++) {
		console.log("origin pair " + i + ": " + originPairs[i].username);
		console.log("relay pair " + i + ": " + relayPairs[i].username);
	}

	console.log("");
	console.log("///////////////////////  ///////////////////////");
	console.log("");
}