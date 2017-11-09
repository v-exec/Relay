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

/*
bodyParser.urlencoded(options)
Parses the text as URL encoded data (which is how browsers tend to send form data from regular forms set to POST)
and exposes the resulting object (containing the keys and values) on req.body
*/
app.use(bodyParser.urlencoded({
	extended: true
}));

/*
bodyParser.json(options)
Parses the text as JSON and exposes the resulting object on req.body.
*/
app.use(bodyParser.json());

//on form recieve (for login) check users list for user, save profile to cookies, and send new page
//if user doesn't exist, add user
app.post("/", function (req, res) {
	var username = req.body.username;
	var password = req.body.password;
	var isOrigin = false;
	var userExists = false;
	var users = JSON.parse(fs.readFileSync('users.json', 'utf8'));

	if (req.body.login == "origin") isOrigin = true;

	for (var i = 0; i < users.length; i++) {
		var user = users[i];

		if (user.name == username) {
			userExists = true;

			if (user.pass == password) {
				if (isOrigin) res.sendFile(__dirname + '/public/desktop/index.html');
				else res.sendFile(__dirname + '/public/mobile/index.html');
			} else {
				res.sendFile(__dirname + '/public/index.html');
			}
		}
	}

	//user doesn't exist, add user
	if (!userExists && password != "") {
		users.push({
			id: users.length,
			name: username,
			pass: password,
			level: 0,
			xp: 0
		});

		var json = JSON.stringify(users);
		fs.writeFile('users.json', json, 'utf8');

		if (isOrigin) res.sendFile(__dirname + '/public/desktop/index.html');
		else res.sendFile(__dirname + '/public/mobile/index.html');
	} else {
		res.sendFile(__dirname + '/public/index.html');
	}
});

//socket communication
io.on('connection', function(socket) {

	//sends profile information to client when user signs in
	socket.on('load profile data', function(username) {
		var users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
		var targetUser;

		for (var i = 0; i < users.length; i++) {
			var user = users[i];

			if (user.name == username) {
				targetUser = user;
			}
		}

		socket.emit('profile data', targetUser);
	});

});