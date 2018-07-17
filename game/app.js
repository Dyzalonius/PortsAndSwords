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
console.log("\x1b[4m%s\x1b[0m", "Server started.");

////////////////////////////////////////
//         HANDLE CONNECTIONS         //
////////////////////////////////////////

var io = require('socket.io')(server, {});

io.sockets.on('connection', function (client) {
    // give client a unique id and add to CLIENT_LIST
    client.id = Math.random();
    CLIENT_LIST[client.id] = client;
    console.log("\x1b[33m%s\x1b[0m", "Client '" + client.id + "' connected.");

    // initialize a player for the client
    Player.onConnect(client);

    // listen for disconnect
    client.on('disconnect', function () {
        delete CLIENT_LIST[client.id];
        Player.onDisconnect(client);

        console.log("\x1b[33m%s\x1b[0m", "Client '" + client.id + "' disconnected.");
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
var Ship = function (id, posX, posY, direction, side) {
    var self = Entity();
    self.id = id;
    self.posX = posX;
    self.posY = posY;
    self.direction = direction;
    self.side = side;
    self.headingOffsetX = 0;
    self.headingOffsetY = 0;
    self.childOffset = [0, 0];

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
Ship.spawn = function (id, gridX, gridY, direction, side) {
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
    var ship = Ship(id, posX, posY, direction, side);

    return ship;
}

// PLAYER
var Player = function (id) {
    var self = Entity();
    self.id = id;
    self.name = null;
    self.child = null;
    self.gameID = null;
    self.lastMousePos = [0, 0];

    self.onDisconnect = function () {
        self.gameID = null;
    }

    return self;
}
Player.onConnect = function (client) {
    // create new player
    var player = Player(client.id);

    // listen for input keyPress
    client.on('keyPress', function (data) {
        if (data.inputId === 'R') {
            if (player.child != null) {
                player.child.rotate(player.lastMousePos);
            }
        }
        if (data.inputId === 'O') {
            var game = Game.find(player.gameID);
            
            if (game != null) {
                game.restart();
            };
        }
    });

    // listen for input mouseDown
    client.on('mouseDown', function (data) {
        player.lastMousePos = [data.posX, data.posY];
        var game = Game.find(player.gameID);

        if (game != null) {
            var ship = game.checkOverlap(player.lastMousePos);

            if (ship != null) {
                player.child = ship;
                ship.childOffset = [(data.posX - ship.posX), (data.posY - ship.posY)];
            }
        }
    });

    // listen for input mousePos
    client.on('mousePos', function (data) {
        player.lastMousePos = [data.posX, data.posY];
        if (player.child != null) {
            player.child.setPosOffset(player.lastMousePos);
        }
    });

    // listen for input mouseUp
    client.on('mouseUp', function () {
        if (player.child != null) {
            player.child.setPosGrid();
            player.child = null;
        };
    });

    // listen for login
    client.on('login', function (data) {
        player.name = data.name;
    });

    // listen for gameCreate
    client.on('gameCreate', function (data) {
        var game = Game.create(data.name);

        player.gameID = game.id;
        game.clients.push(client);

        console.log("\x1b[7m%s\x1b[0m", "Game '" + game.id + "' started.");
        console.log("\x1b[37m%s\x1b[0m", "Game '" + game.id + "' joined by Client '" + client.id + "'.");
    });

    // listen for gameJoin
    client.on('gameJoin', function (data) {
        player.gameID = data.gameID;

        game = Game.find(data.gameID);
        game.clients.push(client);

        console.log("\x1b[37m%s\x1b[0m", "Game '" + game.id + "' joined by Client '" + client.id + "'.");
    });

    // listen for gameLeave
    client.on('gameLeave', function () {
        // remove the gameID from the player
        player.onDisconnect();

        // remove the player from the game's clients
        Player.onDisconnect(client);
    });

    Game.emit();
}
Player.onDisconnect = function (client) {
    // find the game the player was in
    for (var i = GAME_LIST.length - 1; i >= 0; i--) {
        var game = GAME_LIST[i];

        for (var j = game.clients.length - 1; j >= 0; j--) {
            var player = game.clients[j];

            if (player.id == client.id) {
                game.onDisconnect(client);
                return;
            }
        }
    }
}

// GAME
var Game = function (name) {
    var self = {
        name: name,
        id: nextGameID,
        clients: [],
        ships: [],
        nextShipID: 0
    }
    self.initialize = function () {
        self.spawnShips();
    }
    self.restart = function () {
        self.initialize();
        console.log("\x1b[7m%s\x1b[0m", "Game '" + game.id + "' reset.");
    }
    self.spawnShips = function () {
        self.ships = [];
        [[1, 5, 0, 0], [5, 8, 3, 0], [2, 1, 1, 1], [8, 2, 2, 1]].forEach(element => {
            var ship = Ship.spawn(self.nextShipID, element[0], element[1], element[2], element[3]);
            self.nextShipID++;
            self.ships.push(ship);
        });
    }
    self.getPackage = function () {
        var package = [];

        // add positions of all ships to the package
        for (var i in self.ships) {
            var ship = self.ships[i];
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
    self.checkOverlap = function (pos) {
        for (var i = self.ships.length - 1; i >= 0; i--) {
            var ship = self.ships[i];
            
            if (ship.checkOverlap(pos)) {
                return ship;
            }
        }
        return null;
    }
    self.onDisconnect = function (client) {
        self.clients = self.clients.filter(element => element.id != client.id);

        console.log("\x1b[37m%s\x1b[0m", "Game '" + self.id + "' left by Client '" + client.id + "'.");

        // stop game if no clients are remaining
        if (self.clients.length == 0) {
            self.destroy();
        }
    }
    self.destroy = function () {
        GAME_LIST = GAME_LIST.filter(element => element.id != self.id);
        Game.emit();

        console.log("\x1b[7m%s\x1b[0m", "Game '" + self.id + "' stopped.");
    }

    nextGameID++;
    self.initialize();
    GAME_LIST.push(self);
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
            clientCount: game.clients.length
        });
    }

    return package;
}
Game.emit = function () {
    var menuData = Game.fetch();

    for (var i in CLIENT_LIST) {
        CLIENT_LIST[i].emit('menuData', menuData);
    }
}
Game.create = function (name) {
    game = Game(name);
    Game.emit();

    return game;
}
Game.find = function (id) {
    for (i in GAME_LIST) {
        var game = GAME_LIST[i];

        if (game.id == id) {
            return game;
        }
    }

    return null;
}

////////////////////////////////////////
//             GAME LOOP              //
////////////////////////////////////////

var CLIENT_LIST = {};
var GAME_LIST = [];
var nextGameID = 0;

// start loop which ticks every 40ms
setInterval(function () {
    for (var i in GAME_LIST) {
        var game = GAME_LIST[i];

        var gameData = game.getPackage();

        // send all clients the package
        for (var i in game.clients) {
            game.clients[i].emit('gameData', gameData);
        };
    };
}, 1000 / 50);