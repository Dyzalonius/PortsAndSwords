////////////////////////////////////////
//            START SERVER            //
////////////////////////////////////////

var express = require('express');
var app = express();
var server = require('http').Server(app);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

server.listen(2000);
console.log("Server started.");

////////////////////////////////////////
//         HANDLE CONNECTIONS         //
////////////////////////////////////////

var io = require('socket.io')(server, {});

io.sockets.on('connection', function (client) {
    // give client a unique id and add to CLIENT_LIST
    client.id = Math.random();
    CLIENT_LIST[client.id] = client;
    console.log('Client connected. (' + client.id + ')');

    // initialize a player for the client
    Player.onConnect(client);

    // listen for input mousedown
    client.on('mousedown', function (data) {
        /*if (over a ship) {
            copy it and move it with the mouse
        }*/

        // listen for input keydown
        client.on('keydown', function () {
            /* if (you press R) {
                Ship.rotate(id of ship);
            }*/
        });

        // listen for input mouseup
        client.on('mouseup', function () {
            /*remove the copy

            if (position is valid spot for ship) {
                move the original
            }
            */
        });
    });

    // listen for disconnect
    client.on('disconnect', function () {
        console.log('Client disconnected. (' + client.id + ')');
        delete CLIENT_LIST[client.id];
        Player.onDisconnect(client);
    });
});

////////////////////////////////////////
//              CLASSES               //
////////////////////////////////////////

// ENTITY
var Entity = function () {
    var self = {
        posX: 0,
        posY: 0,
        speedX: 0,
        speedY: 0,
        id: ""
    }

    self.update = function () {
        self.updatePosition();
    }

    self.updatePosition = function () {
        self.posX += self.speedX;
        self.posY += self.speedY;
    }

    return self;
}

// SHIP
var Ship = function (posX, posY, direction) {
    var self = Entity();

    self.posX = posX;
    self.posY = posY;
    self.width = 0;
    self.height = 0;
    self.headingOffsetX = 0;
    self.headingOffsetY = 0;
    self.isVertical = true;
    self.isFacingTrue = true;
    self.direction = direction;

    self.id = nextShipID;
    nextShipID++;
    SHIP_LIST[self.id] = self;

    self.rotate = function () {
        // change direction
        direction++;
        if (direction == 4) {
            direction = 0;
        }

        self.updateDirection();
    };

    self.updateDirection = function () {
        // update direction
        switch (direction) {
            case 0:
                isVertical = true;
                isFacingTrue = false;
                break;

            case 1:
                isVertical = false;
                isFacingTrue = true;
                break;

            case 2:
                isVertical = true;
                isFacingTrue = true;
                break;

            case 3:
                isVertical = false;
                isFacingTrue = false;
                break;
        }

        // change dimensions
        if (isVertical) {
            self.width = 50;
            self.height = 150;
        } else {
            self.width = 150;
            self.height = 50;
        }

        // change heading
        if (isFacingTrue) {
            self.headingOffsetX = self.width - 50;
            self.headingOffsetY = self.height - 50;
        } else {
            self.headingOffsetX = 0;
            self.headingOffsetY = 0;
        }
    }

    self.updateDirection();
}
Ship.spawn = function (gridX, gridY, direction) {
    var posX = gridX * 50;
    var posY = gridY * 50;

    // setup facing north
    var isVertical = true;
    var isFacingTrue = false;

    // use direction to determine isVertical and isFacingTrue 
    switch (direction) {
        case 1:
            isVertical = false;
            isFacingTrue = true;
            break;

        case 2:
            isFacingTrue = true;
            break;

        case 3:
            isVertical = false;
            break;
    }

    // create new ship
    var ship = Ship(posX, posY, direction, isVertical, isFacingTrue);
}
Ship.rotate = function (id) {
    var ship = SHIP_LIST[id];
    ship.rotate();
}
Ship.update = function () {
    var package = [];

    // add positions of all ships to the package
    for (var i in SHIP_LIST) {
        var ship = SHIP_LIST[i];

        // change ship's position
        ship.update();

        // add ship's position to the package
        package.push({
            posX: ship.posX,
            posY: ship.posY,
            width: ship.width,
            height: ship.height,
            headingOffsetX: ship.headingOffsetX,
            headingOffsetY: ship.headingOffsetY
        });
    }

    return package;
}

// PLAYER
var Player = function (id) {
    var self = Entity();

    self.posX = 250;
    self.posY = 250;
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.maxSpd = 5;
    PLAYER_LIST[id] = self;

    self.update = function () {
        self.updateSpeed();
        self.updatePosition();
    }

    self.updateSpeed = function () {
        if (self.pressingRight) {
            self.speedX = self.maxSpd;
        } else if (self.pressingLeft) {
            self.speedX = -self.maxSpd;
        } else {
            self.speedX = 0;
        }

        if (self.pressingUp) {
            self.speedY = -self.maxSpd;
        } else if (self.pressingDown) {
            self.speedY = self.maxSpd;
        } else {
            self.speedY = 0;
        }
    }

    return self;
}
Player.onConnect = function (client) {
    // create new player
    var player = Player(client.id);

    // listen for input
    client.on('keyPress', function (data) {
        if (data.inputId === 'left') {
            player.pressingLeft = data.state;
        } else if (data.inputId === 'right') {
            player.pressingRight = data.state;
        } else if (data.inputId === 'up') {
            player.pressingUp = data.state;
        } else if (data.inputId === 'down') {
            player.pressingDown = data.state;
        }
    });
}
Player.onDisconnect = function (client) {
    delete PLAYER_LIST[client.id];
}
Player.update = function () {
    var package = [];

    // add positions of all players to the package
    for (var i in PLAYER_LIST) {
        var player = PLAYER_LIST[i];

        // change player's position
        player.update();

        // add player's position to the package
        package.push({
            posX: player.posX,
            posY: player.posY,
            number: player.number
        });
    }

    return package;
}

////////////////////////////////////////
//             GAME LOOP              //
////////////////////////////////////////

var nextShipID = 0;
var CLIENT_LIST = {};
var PLAYER_LIST = {};
var SHIP_LIST = {};

// spawn all ships
[[2, 11, 0]].forEach(element => {
    Ship.spawn(element[0], element[1], element[2]);
});

// start loop which ticks every 40ms
setInterval(function () {
    var package = {};
    package[0] = Player.update();
    package[1] = Ship.update();

    // send all clients the package
    for (var i in CLIENT_LIST) {
        var client = CLIENT_LIST[i];

        // send client it's new position
        client.emit('package', package);
    };
}, 1000 / 50);