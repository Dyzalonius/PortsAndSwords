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
        width: 0,
        height: 0,
        speedX: 0,
        speedY: 0,
        id: ""
    }

    return self;
}

// SHIP
var Ship = function (posX, posY, direction, side) {
    var self = Entity();

    self.posX = posX;
    self.posY = posY;
    self.headingOffsetX = 0;
    self.headingOffsetY = 0;
    self.direction = direction;
    self.side = side;
    self.childOffset = [0, 0];

    self.id = nextShipID;
    nextShipID++;
    SHIP_LIST[self.id] = self;

    self.checkOverlap = function (pos) {
        if (pos[0] > (self.posX)
            && pos[0] < (self.posX + self.width)
            && pos[1] > (self.posY)
            && pos[1] < (self.posY + self.height)) {
            return true;
        }
        return false;
    }

    self.rotate = function (pos) {
        // change direction
        self.direction++;
        if (self.direction == 4) {
            self.direction = 0;
        }

        self.updateDirection();
        self.setPosOffset(pos);
    }

    self.updateDirection = function () {
        // update childOffset
        var temp = self.childOffset[0];
        self.childOffset[0] = self.height - self.childOffset[1];
        self.childOffset[1] = temp;

        // update dimensions
        switch (self.direction) {
            case 0:
                self.width = 50;
                self.height = 150;
                self.headingOffsetX = 0;
                self.headingOffsetY = 0;
                break;

            case 1:
                self.width = 150;
                self.height = 50;
                self.headingOffsetX = self.width - 50;
                self.headingOffsetY = self.height - 50;
                break;

            case 2:
                self.width = 50;
                self.height = 150;
                self.headingOffsetX = self.width - 50;
                self.headingOffsetY = self.height - 50;
                break;

            case 3:
                self.width = 150;
                self.height = 50;
                self.headingOffsetX = 0;
                self.headingOffsetY = 0;
                break;
        }
    }

    self.setPosOffset = function (pos) {
        self.posX = (pos[0] - self.childOffset[0]);
        self.posY = (pos[1] - self.childOffset[1]);
    }

    self.setPosGrid = function () {
        self.posX = Math.round(self.posX / 50) * 50;
        self.posY = Math.round(self.posY / 50) * 50;
    }

    self.updateDirection();

    return self;
}
Ship.spawn = function (gridX, gridY, direction, side) {
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
    var ship = Ship(posX, posY, direction, side);
}
Ship.rotate = function (id, pos) {
    var ship = SHIP_LIST[id];
    ship.rotate(pos);
}
Ship.update = function () {
    var package = [];

    // add positions of all ships to the package
    for (var i in SHIP_LIST) {
        var ship = SHIP_LIST[i];

        // add ship's position to the package
        package.push({
            posX: ship.posX,
            posY: ship.posY,
            width: ship.width,
            height: ship.height,
            headingOffsetX: ship.headingOffsetX,
            headingOffsetY: ship.headingOffsetY,
            side: ship.side
        });
    }

    return package;
}
Ship.checkOverlap = function (pos) {
    for (var i in SHIP_LIST) {
        var ship = SHIP_LIST[i];
        if (ship.checkOverlap(pos)) {
            return ship;
        }
    }
    return null;
}

// PLAYER
var Player = function (id) {
    var self = Entity();

    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    PLAYER_LIST[id] = self;
    self.child = null;
    self.lastMousePos = [0, 0];

    return self;
}
Player.onConnect = function (client) {
    // create new player
    var player = Player(client.id);

    // listen for input keypress
    client.on('keyPress', function (data) {
        if (data.inputId === 'R') {
            if (player.child != null) {
                player.child.rotate(player.lastMousePos);
            }
        }
        if (data.inputId === 'O') {
            GameStart();
        }
    });

    client.on('mouseDown', function (data) {
        player.lastMousePos = [data.posX, data.posY];
        var ship = Ship.checkOverlap(player.lastMousePos);
        if (ship != null) {
            player.child = ship;
            ship.childOffset = [(data.posX - ship.posX), (data.posY - ship.posY)];
        }
    });

    client.on('mousePos', function (data) {
        player.lastMousePos = [data.posX, data.posY];
        if (player.child != null) {
            player.child.setPosOffset(player.lastMousePos);
        }
    });

    client.on('mouseUp', function (data) {
        if (player.child != null) {
            player.child.setPosGrid();
            player.child = null;
        };
    });

    // listen for input mousedown
    /*client.on('mousedown', function (data) {
        if (over a ship) {
            copy it and move it with the mouse
        }

        // listen for input keydown
        client.on('keyPress', function () {
            if (you press R) {
                Ship.rotate(id of ship);
            }
        });

        // listen for input mouseup
        client.on('mouseup', function () {
            remove the copy

            if (position is valid spot for ship) {
                move the original
            }
            
        });
    });*/
}
Player.onDisconnect = function (client) {
    delete PLAYER_LIST[client.id];
}

// GAME
var Game = function () {
    var self = {
        name: "",
        id: Math.random(),
        players: []
    }

    return self;
}
Game.fetch = function () {
    var package = [];

    // add positions of all ships to the package
    for (var i in GAME_LIST) {
        var game = GAME_LIST[i];

        // add ship's position to the package
        package.push({
            id: game.id,
            name: game.name,
            playerCount: game.players.length
        });
    }

    return package;
}

////////////////////////////////////////
//           SUB FUNCTIONS            //
////////////////////////////////////////

var GameStart = function () {
    SHIP_LIST = {};
    nextShipID = 0;

    // spawn all ships
    [[1, 5, 0, 0], [5, 8, 3, 0], [2, 1, 1, 1], [8, 2, 2, 1]].forEach(element => {
        Ship.spawn(element[0], element[1], element[2], element[3]);
    });
    console.log('Game start.');
}

////////////////////////////////////////
//             GAME LOOP              //
////////////////////////////////////////

var CLIENT_LIST = {};
var GAME_LIST = {};
var PLAYER_LIST = {};
var SHIP_LIST;
var nextShipID;

GameStart();

// start loop which ticks every 40ms
setInterval(function () {
    var package = Ship.update();

    // send all clients the package
    for (var i in CLIENT_LIST) {
        var client = CLIENT_LIST[i];

        // send client it's new position
        client.emit('package', package);
    };
}, 1000 / 50);