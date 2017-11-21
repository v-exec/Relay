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
					origins.push({socket:socket, id:socket.id, username:user.name});
				} else if (data.type === 'relay') {
					relays.push({socket:socket, id:socket.id, username:user.name, lat:0, lon:0});
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
				for (var j = 0; j < originPairs.length; j++) {
					if (originPairs[i]) {
						if (originPairs[j].username === origins[i].username) {
							socket.to(relayPairs[j].id).emit('disbanded', originPairs[j].id);

							//cancel any ongoing hacks
							for (var k = 0; k < hacks.length; k++) {
								if (hacks[k].hackerIndex == j || hacks[k].hackeeIndex == j) {
									if (originPairs[hacks[k].hackerIndex] && hacks[k].hackerIndex != j) socket.to(originPairs[hacks[k].hackerIndex].id).emit('hack cancel', '');
									if (relayPairs[hacks[k].hackerIndex]) socket.to(relayPairs[hacks[k].hackerIndex].id).emit('hack cancel', '');
									if (originPairs[hacks[k].hackeeIndex] && hacks[k].hackeeIndex != j) socket.to(originPairs[hacks[k].hackeeIndex].id).emit('hack cancel', '');
									if (relayPairs[hacks[k].hackeeIndex]) socket.to(relayPairs[hacks[k].hackeeIndex].id).emit('hack cancel', '');
									hacks.splice(k, 1);
									break;
								}
							}
							//disband group
							originPairs[j] = null;
							relayPairs[j] = null;
						}
					}
				}
				origins.splice(i, 1);
				return;
			}
		}

		for (var i = 0; i < relays.length; i++) {
			if (relays[i].id === socket.id) {
				console.log(relays[i].username + ' has disconnected.');
				for (var j = 0; j < relayPairs.length; j++) {
					if (relayPairs[i]) {
						if (relayPairs[j].username === relays[i].username) {
							socket.to(originPairs[j].id).emit('disbanded', relayPairs[j].id);

							for (var k = 0; k < hacks.length; k++) {
								if (hacks[k].hackerIndex == j || hacks[k].hackeeIndex == j) {
									if (originPairs[hacks[k].hackerIndex]) socket.to(originPairs[hacks[k].hackerIndex].id).emit('hack cancel', '');
									if (relayPairs[hacks[k].hackerIndex] && hacks[k].hackerIndex != j) socket.to(relayPairs[hacks[k].hackerIndex].id).emit('hack cancel', '');
									if (originPairs[hacks[k].hackeeIndex]) socket.to(originPairs[hacks[k].hackeeIndex].id).emit('hack cancel', '');
									if (relayPairs[hacks[k].hackeeIndex] && hacks[k].hackerIndex != j) socket.to(relayPairs[hacks[k].hackeeIndex].id).emit('hack cancel', '');
									hacks.splice(k, 1);
									break;
								}
							}
							originPairs[j] = null;
							relayPairs[j] = null;
						}
					}
				}
				relays.splice(i, 1);
				return;
			}
		}
	});

	//on receive location data from relay, save location and broadcast to all origins
	socket.on('user location', function(data) {
		console.log('LOCATION');
		for (var i = 0; i < relays.length; i++) {
			if (relays[i].username === data.user) {
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
					if (relayPairs[j]) {
						if (relayPairs[j].username === data.relay) {
							socket.emit('err', 'user is already paired');
							return;
						}
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
			if (originPairs[i]) {
				if (originPairs[i].username === data.user) {
					socket.emit('disbanded', relayPairs[i].id);
					socket.to(relayPairs[i].id).emit('disbanded', originPairs[i].id);
					originPairs[i] = null;
					relayPairs[i] = null;
					return;
				}
			}
			
			if (relayPairs[i]) {
				if (relayPairs[i].username === data.user) {
					socket.emit('disbanded', originPairs[i].id);
					socket.to(originPairs[i].id).emit('disbanded', relayPairs[i].id);
					originPairs[i] = null;
					relayPairs[i] = null;
					return;
				}
			}
		}
	});

	//on chat, send message to partner if they exist
	socket.on('chat', function(data) {
		console.log('CHAT');
		for (var i = 0; i < originPairs.length; i++) {
			if (originPairs[i]) {
				if (originPairs[i].username === data.user) {
					socket.to(relayPairs[i].id).emit('chat message', {user:data.user, message:data.message});
					return;
				}
			}

			if (relayPairs[i]) {
				if (relayPairs[i].username === data.user) {
					socket.to(originPairs[i].id).emit('chat message', {user:data.user, message:data.message});
					return;
				}
			}
		}
	});

	//on hack initiation, find origin's relay, check their distance from other relays, and then target other relay closest to them
	socket.on('initiate hack', function(user) {
		console.log('INITIATE HACK');
		for (var i = 0; i < originPairs.length; i++) {
			if (originPairs[i]) {
				if (originPairs[i].username === user) {
					for (var j = 0; j < relayPairs.length; j++) {
						if (relayPairs[j]) {
							if (relayPairs[i] != relayPairs[j]) {

								//if distance between origin's relay and first found target is less than 0.1km, begin hack
								//TODO: SHOULD BE CHANGED TO FINDING ALL RELAYS' DISTANCE AND CHOOSING CLOSEST
								if(getDistance(relayPairs[i].lat, relayPairs[i].lon, relayPairs[j].lat, relayPairs[j].lon) < 0.1) {
									hacks.push({hackerIndex:i, hackeeIndex:j, progress: 0});
									return;
								}
							}
						}
					}
				}
			}
		}

		//if no target was found, emit 'no target found'
		socket.emit('err', 'could not find target near enough to relay');
	});

	//on counter ack, check if origin's relay is in hack and close enough to the hacker relay, and if so, terminate hack
	//TODO: NOT TESTED YET
	socket.on('counterhack', function(user) {
		for (var i = 0; i < originPairs.length; i++) {
			if (originPairs[i]) {
				if (originPairs[i].username === user) {
					for (var j = 0; j < hacks.length; j++) {
						if (hacks[j].hackeeIndex == i) {
							if (getDistance(relayPairs[hacks[j].hackeeIndex].lat, relayPairs[hacks[j].hackeeIndex].lon, relayPairs[hacks[j].hackerIndex].lat, relayPairs[hacks[j].hackerIndex].lon) < 0.04) {
								originPairs[hacks[j].hackerIndex].socket.emit('hack failure', {progress:hacks[j].progress, role: 'hacker', targetOrigin: originPairs[hacks[j].hackeeIndex].username, targetRelay: relayPairs[hacks[j].hackeeIndex].username, reason: 'counter'});
								relayPairs[hacks[j].hackerIndex].socket.emit('hack failure', {progress:hacks[j].progress, role: 'hacker', targetOrigin: originPairs[hacks[j].hackeeIndex].username, targetRelay: relayPairs[hacks[j].hackeeIndex].username, reason: 'counter'});
								originPairs[hacks[j].hackeeIndex].socket.emit('hack success', {progress:hacks[j].progress, role: 'target', hackerOrigin: originPairs[hacks[j].hackerIndex].username, hackerRelay: relayPairs[hacks[j].hackerIndex].username, reason: 'counter'});
								relayPairs[hacks[j].hackeeIndex].socket.emit('hack success', {progress:hacks[j].progress, role: 'target', hackerOrigin: originPairs[hacks[j].hackerIndex].username, hackerRelay: relayPairs[hacks[j].hackerIndex].username, reason: 'counter'});
								hacks.splice(j, 1);
								return;
							} else {
								socket.emit('err', 'hacker relay is too far');
								return;
							}
						}
					}
				}
			}
		}
	});

	//persistently emit progress ongoing hacks
	setInterval(function() {
		for (var i = 0; i < hacks.length; i++) {
			if (hacks[i].progress == 0) {
				originPairs[hacks[i].hackerIndex].socket.emit('hack begin', {progress:hacks[i].progress, role: 'hacker', targetOrigin: originPairs[hacks[i].hackeeIndex].username, targetRelay: relayPairs[hacks[i].hackeeIndex].username});
				relayPairs[hacks[i].hackerIndex].socket.emit('hack begin', {progress:hacks[i].progress, role: 'hacker', targetOrigin: originPairs[hacks[i].hackeeIndex].username, targetRelay: relayPairs[hacks[i].hackeeIndex].username});
				originPairs[hacks[i].hackeeIndex].socket.emit('hack begin', {progress:hacks[i].progress, role: 'target', hackerOrigin: originPairs[hacks[i].hackerIndex].username, hackerRelay: relayPairs[hacks[i].hackerIndex].username});
				relayPairs[hacks[i].hackeeIndex].socket.emit('hack begin', {progress:hacks[i].progress, role: 'target', hackerOrigin: originPairs[hacks[i].hackerIndex].username, hackerRelay: relayPairs[hacks[i].hackerIndex].username});
				
				hacks[i].progress += 1.0;
				hacks[i].progress = Math.round(hacks[i].progress * 10) / 10;

			} else if (hacks[i].progress < 100) {
				hacks[i].progress += 1.0;
				hacks[i].progress = Math.round(hacks[i].progress * 10) / 10;

				if (getDistance(relayPairs[hacks[i].hackerIndex].lat, relayPairs[hacks[i].hackerIndex].lon, relayPairs[hacks[i].hackeeIndex].lat, relayPairs[hacks[i].hackeeIndex].lon) > 0.7) {
					originPairs[hacks[i].hackerIndex].socket.emit('hack failure', {progress:hacks[i].progress, role: 'hacker', targetOrigin: originPairs[hacks[i].hackeeIndex].username, targetRelay: relayPairs[hacks[i].hackeeIndex].username, reason: 'escape'});
					relayPairs[hacks[i].hackerIndex].socket.emit('hack failure', {progress:hacks[i].progress, role: 'hacker', targetOrigin: originPairs[hacks[i].hackeeIndex].username, targetRelay: relayPairs[hacks[i].hackeeIndex].username, reason: 'escape'});
					originPairs[hacks[i].hackeeIndex].socket.emit('hack success', {progress:hacks[i].progress, role: 'target', hackerOrigin: originPairs[hacks[i].hackerIndex].username, hackerRelay: relayPairs[hacks[i].hackerIndex].username, reason: 'escape'});
					relayPairs[hacks[i].hackeeIndex].socket.emit('hack success', {progress:hacks[i].progress, role: 'target', hackerOrigin: originPairs[hacks[i].hackerIndex].username, hackerRelay: relayPairs[hacks[i].hackerIndex].username, reason: 'escape'});
					hacks.splice(i, 1);
				} else {
					originPairs[hacks[i].hackerIndex].socket.emit('hack progress', {progress:hacks[i].progress, role: 'hacker', targetOrigin: originPairs[hacks[i].hackeeIndex].username, targetRelay: relayPairs[hacks[i].hackeeIndex].username});
					relayPairs[hacks[i].hackerIndex].socket.emit('hack progress', {progress:hacks[i].progress, role: 'hacker', targetOrigin: originPairs[hacks[i].hackeeIndex].username, targetRelay: relayPairs[hacks[i].hackeeIndex].username});
					originPairs[hacks[i].hackeeIndex].socket.emit('hack progress', {progress:hacks[i].progress, role: 'target', hackerOrigin: originPairs[hacks[i].hackerIndex].username, hackerRelay: relayPairs[hacks[i].hackerIndex].username});
					relayPairs[hacks[i].hackeeIndex].socket.emit('hack progress', {progress:hacks[i].progress, role: 'target', hackerOrigin: originPairs[hacks[i].hackerIndex].username, hackerRelay: relayPairs[hacks[i].hackerIndex].username});
				}
				
			} else {
				originPairs[hacks[i].hackerIndex].socket.emit('hack success', {progress:hacks[i].progress, role: 'hacker', targetOrigin: originPairs[hacks[i].hackeeIndex].username, targetRelay: relayPairs[hacks[i].hackeeIndex].username, reason: 'hack'});
				relayPairs[hacks[i].hackerIndex].socket.emit('hack success', {progress:hacks[i].progress, role: 'hacker', targetOrigin: originPairs[hacks[i].hackeeIndex].username, targetRelay: relayPairs[hacks[i].hackeeIndex].username, reason: 'hack'});
				originPairs[hacks[i].hackeeIndex].socket.emit('hack failure', {progress:hacks[i].progress, role: 'target', hackerOrigin: originPairs[hacks[i].hackerIndex].username, hackerRelay: relayPairs[hacks[i].hackerIndex].username, reason: 'hack'});
				relayPairs[hacks[i].hackeeIndex].socket.emit('hack failure', {progress:hacks[i].progress, role: 'target', hackerOrigin: originPairs[hacks[i].hackerIndex].username, hackerRelay: relayPairs[hacks[i].hackerIndex].username, reason: 'hack'});
				hacks.splice(i, 1);
			}
		}
	}, 1000);
});

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

//limits decimal numbers
function roundedToFixed(num, digits){
	var rounder = Math.pow(10, digits);
	return (Math.round(num * rounder) / rounder).toFixed(digits);
}

//debugging
function printPlayers() {
	console.log("");
	console.log("/////////////////////// USERS ///////////////////////");
	console.log("");

	for (var i = 0; i < relays.length; i++) {
		console.log("relay " + i + ": " + relays[i].username);
	}

	console.log("");

	for (var i = 0; i < origins.length; i++) {
		console.log("origin " + i + ": " + origins[i].username);
	}

	console.log("");

	for (var i = 0; i < originPairs.length; i++) {
		if (originPairs[i]) {
			console.log("origin pair " + i + ": " + originPairs[i].username);
		}
		
		if (relayPairs[i]) {
			console.log("relay pair " + i + ": " + relayPairs[i].username);
		}
	}
}

setInterval(function() {
	printPlayers();
}, 1000);