var socket = io();

//get user
var user = getCookie("relay-username");
if (user == "") user = null;

if (user) {
    socket.emit('load profile data', user);
}

//socket communication
socket.on('profile data', function(data) {
    console.log(data);

    var originName = document.getElementById('origin');
    originName.innerHTML = 'origin: ' + data.name;
});

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