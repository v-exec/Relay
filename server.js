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
var users = [];

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
			for (var j = 0; j < users.length; j++) {
				if (users[j].username == user.name) {
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
	socket.on('load profile data', function(username) {
		var usersList = JSON.parse(fs.readFileSync('users.json', 'utf8'));
		var targetUser;

		//find user
		for (var i = 0; i < usersList.length; i++) {
			var user = usersList[i];

			//send user data
			if (user.name == username) {
				targetUser = user;
				users.push({id:socket.id, username:user.name});
				socket.emit('profile data', targetUser);
			}
		}
	});

	//removes user from users array
	socket.on('disconnect', function() {
		for (var i = 0; i < users.length; i++) {
			if (users[i].id == socket.id) {
				users.splice(i, 1);
			}
		}
	});

	//associates 2 players (one origin, one relay)
	socket.on('pair', function(data) {
		for (var i = 0; i < users.length; i++) {

			//find relay
			if (users[i].username == data.relay) {

				//check if relay is already paired
				for (var j = 0; j < relayPairs.length; j++) {
					if (relayPairs[j].username == data.relay) {
						socket.emit('er', 'user is already paired');
						return;
					}
				}

				//find origin
				var originUser;

				for (var j = 0; j < users.length; j++) {
					if (users[j].username == data.origin) {
						originUser = users[j];
					}
				}

				//pair
				originPairs.push(originUser);
				relayPairs.push(users[i]);

				socket.emit('paired', data.relay);
				socket.to(users[i].id).emit('paired', data.origin);
				return;
			}
		}

		//on unsuccessful pairing
		socket.emit('err', 'user is offline, or does not exist');
	});

	//on disband, disassociate pair
	socket.on('disband', function(data) {
		for (var i = 0; i < originPairs.length; i++) {
			if (originPairs[i].username == data.origin) {
				socket.emit('disbanded', relayPairs[i].id);
				socket.to(relayPairs[i].id).emit('disbanded', originPairs[i].id);
				originPairs.splice(i, 1);
				relayPairs.splice(i, 1);
				return;
			} else if (relayPairs[i].username == data.origin) {
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

	});

	//on hack initiation, find origin's relay, and then target other relay closest to them
	socket.on('initiate hack', function(user) {

	});
});