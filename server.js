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
var origins = [];
var relays = [];

//origin-relay pairs
var originPairs = [];
var relayPairs = [];

//on form recieve (for login) check users list for user, save profile to cookies, and send new page
//if user doesn't exist, add user
app.post("/", function (req, res) {
	var username = req.body.username;
	var password = req.body.password;
	var isOrigin = false;
	var userExists = false;
	var usersList = JSON.parse(fs.readFileSync('users.json', 'utf8'));

	if (req.body.login == "origin") isOrigin = true;

	//try to find user in existing profiles
	for (var i = 0; i < usersList.length; i++) {
		var user = usersList[i];

		if (user.name == username) {
			userExists = true;

			//check if user is online
			for (var j = 0; j < origins.length; j++) {
				if (origins[j].username == user.name) {
					res.sendFile(__dirname + '/public/index.html');
					return;
				}
			}

			for (var j = 0; j < relays.length; j++) {
				if (relays[j].username == user.name) {
					res.sendFile(__dirname + '/public/index.html');
					return;
				}
			}

			//if entered right password, send to appropriate page. else, refresh
			if (user.pass == password) {
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

	//sends profile information to client when user signs in
	socket.on('load profile data', function(data) {
		var usersList = JSON.parse(fs.readFileSync('users.json', 'utf8'));

		//find user
		for (var i = 0; i < usersList.length; i++) {
			var user = usersList[i];

			//send user data
			if (user.name == data.user) {
				if (data.type === 'origin') {
					origins.push({id:socket.id, username:user.name});
				} else if (data.type === 'relay') {
					relays.push({id:socket.id, username:user.name});
				}
				
				socket.emit('profile data', user);
			}
		}
	});

	//removes user from users array
	socket.on('disconnect', function() {

		for (var i = 0; i < origins.length; i++) {
			if (origins[i].id == socket.id) {
				origins.splice(i, 1);
				return;
			}
		}

		for (var i = 0; i < relays.length; i++) {
			if (relays[i].id == socket.id) {
				relays.splice(i, 1);
				return;
			}
		}

	});

	//associates 2 players (one origin, one relay)
	socket.on('pair', function(data) {
		for (var i = 0; i < relays.length; i++) {

			//find relay
			if (relays[i].username == data.relay) {

				//check if relay is already paired
				for (var j = 0; j < relayPairs.length; j++) {
					if (relayPairs[j].username == data.relay) {
						socket.emit('er', 'user is already paired');
						return;
					}
				}

				//find origin
				var originUser;

				for (var j = 0; j < origins.length; j++) {
					if (origins[j].username == data.origin) {
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
		for (var i = 0; i < originPairs.length; i++) {
			if (originPairs[i].username == data.user) {
				socket.emit('disbanded', relayPairs[i].id);
				socket.to(relayPairs[i].id).emit('disbanded', originPairs[i].id);
				originPairs.splice(i, 1);
				relayPairs.splice(i, 1);
				return;
			} else if (relayPairs[i].username == data.user) {
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
		for (var i = 0; i < originPairs.length; i++) {
			if (originPairs[i].username == data.user) {
				socket.to(relayPairs[i].id).emit('chat message', {user:data.user, message:data.message});
				return;
			} else if (relayPairs[i].username == data.user) {
				socket.to(originPairs[i].id).emit('chat message', {user:data.user, message:data.message});
				return;
			}
		}
	});

	//on hack initiation, find origin's relay, and then target other relay closest to them
	socket.on('initiate hack', function(user) {

	});
});