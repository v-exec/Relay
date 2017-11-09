var socket = io();
var usernameBox = document.getElementById('username');

var form = document.getElementById('login');
form.addEventListener("submit", save, false);

function save() {
	var username = usernameBox.value;
	console.log(username);
	document.cookie = "relay-username=" + username +"; expires=Fri, 31 Dec 2020 23:59:59 GMT;";
}