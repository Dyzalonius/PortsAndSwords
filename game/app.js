////////////////////////////////////////
//            START SERVER            //
////////////////////////////////////////

var express = require('express');
var app = express();
var server = require('http').Server(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

server.listen(2000);
console.log("Server started.");

////////////////////////////////////////
//         HANDLE CONNECTIONS         //
////////////////////////////////////////

var CLIENT_LIST = {};
var PLAYER_LIST = {};

var Player = function(id) {
    var self = {
        x: 250,
        y: 250,
        id: id,
        number: "" + Math.floor(10 * Math.random()),

        pressingRight: false,
        pressingLeft: false,
        pressingUp: false,
        pressingDown: false,
        maxSpd: 10
    };

    self.updatePosition = function() {
        if (self.pressingRight) {
            self.x += self.maxSpd;
        };
        if (self.pressingLeft) {
            self.x -= self.maxSpd;
        };
        if (self.pressingUp) {
            self.y -= self.maxSpd;
        };
        if (self.pressingDown) {
            self.y += self.maxSpd;
        };
    };

    return self;
}

var io = require('socket.io')(server, {});

io.sockets.on('connection', function(client) {
    // give client a unique id and add to CLIENT_LIST
    client.id = Math.random();
    CLIENT_LIST[client.id] = client;

    // create a player for the client and add to PLAYER_LIST
    var player = Player(client.id);
    PLAYER_LIST[client.id] = player;
    console.log('Player ' + player.number + ' (Client ' + client.id + ') connected.');

    // handle disconnect
    client.on('disconnect', function() {
        console.log('Client (' + client.number + ') disconnected.');
        delete CLIENT_LIST[client.id];
        delete PLAYER_LIST[client.id];
    });
    
    // handle input
    client.on('keyPress', function(data) {
        if (data.inputId === 'left') {
            player.pressingLeft = data.state;
        } else if (data.inputId === 'right') {
            player.pressingRight = data.state;
        } else if (data.inputId === 'up') {
            player.pressingUp = data.state;
        } else if (data.inputId === 'down') {
            player.pressingDown = data.state;
        };
    });
});

////////////////////////////////////////
//             SHARE DATA             //
////////////////////////////////////////

// start loop which ticks every 40ms
setInterval(function() {
    var package = [];

    // add positions of all players to the package
    for(var i in PLAYER_LIST) {
        var player = PLAYER_LIST[i];

        // change client's position
        player.updatePosition();

        // add client's position to the package
        package.push({
            x: player.x,
            y: player.y,
            number: player.number
        });
    };

    // send all clients the package
    for(var i in CLIENT_LIST) {
        var client = CLIENT_LIST[i];

        // send client it's new position
        client.emit('package', package);
    };
}, 1000/25);