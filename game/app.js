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

        // check if player is still in a game
        var game = Game.findWithPlayer(client);

        // remove player from game if still in one
        if (game != null) {
            game.onDisconnect(client);
        }

        console.log("\x1b[33m%s\x1b[0m", "Client '" + client.id + "' disconnected.");
    });
});

////////////////////////////////////////
//              CLASSES               //
////////////////////////////////////////

// ENTITY
var Entity = function () {
    var self = {
        pos: [0, 0],
        size: [0, 0],
        speedX: 0,
        speedY: 0,
        id: ""
    }

    return self;
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
    self.onConnect = function (gameID, client) {
        self.gameID = gameID;

        game = Game.findWithID(gameID);
        game.clients.push(client);

        // sitdown as player if still open
        if (game.player1 == null) {
            game.player1 = self;
            console.log("\x1b[37m%s\x1b[0m", "Game '" + game.id + "' joined by Client '" + client.id + "' as Player1.");
        } else if (game.player2 == null) {
            game.player2 = self;
            console.log("\x1b[37m%s\x1b[0m", "Game '" + game.id + "' joined by Client '" + client.id + "' as Player2.");
        } else {
            console.log("\x1b[37m%s\x1b[0m", "Game '" + game.id + "' joined by Client '" + client.id + "' as Spectator.");
        }
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
            var game = Game.findWithID(player.gameID);

            if (game != null) {
                game.restart();
            };
        }
    });

    // listen for input mouseDown
    client.on('mouseDown', function (data) {
        player.lastMousePos = [data.posX, data.posY];
        var game = Game.findWithID(player.gameID);

        if (game != null) {
            var ship = game.checkHover(player.lastMousePos, player.id);

            if (ship != null) {
                player.child = ship;
                ship.childOffset = [(data.posX - ship.pos[0]), (data.posY - ship.pos[1])];
            }
        }
    });

    // listen for input mousePos
    client.on('mousePos', function (data) {
        player.lastMousePos = [data.posX, data.posY];
        if (player.child != null) {
            player.child.setPosWithOffset(player.lastMousePos);
        }
    });

    // listen for input mouseUp
    client.on('mouseUp', function () {
        if (player.child != null) {
            player.child.snapToGrid();

            var game = Game.findWithPlayer(player);

            if (player.child.isLegalMove(game)) {
                player.child.allowMove = false;
                player.child.update();
                player.child.checkDestroy(game);
                player.child = null;
            } else {
                player.child.discardUpdate();
                player.child = null;
            }
        }
    });

    // listen for login
    client.on('login', function (data) {
        player.name = data.name;
    });

    // listen for gameCreate
    client.on('gameCreate', function (data) {
        var game = Game.create(data.name);

        player.onConnect(game.id, client);
    });

    // listen for gameJoin
    client.on('gameJoin', function (data) {
        player.onConnect(data.gameID, client);
    });

    // listen for gameLeave
    client.on('gameLeave', function () {
        // remove the gameID from the player
        player.onDisconnect();

        // remove the player from the game's clients
        Game.findWithPlayer(player).onDisconnect(client);
    });

    // listen for endTurn
    client.on('endTurn', function () {
        Game.findWithPlayer(player).changeInitiative();
    });

    // listen for wind
    client.on('wind', function (data) {
        var game = Game.findWithPlayer(player);

        // check if the request is a confirm request or a changewind request
        if (data.request == "Confirm") {
            game.windDirectionConfirmed = true;
            game.confirmWind();
        } else {
            var direction = ["N", "E", "S", "W"].findIndex((element) => {
                return element == data.request;
            });

            game.changeWind(direction);
        }
    });

    Game.emitList();
}

// SHIP
var Ship = function (id, pos, direction, side) {
    var self = Entity();
    self.id = id;
    self.side = side;
    self.pos = pos;
    self.direction = direction;
    self.headingOffset = [0, 0];
    self.childOffset = [0, 0];
    self.posPublic = pos;
    self.sizePublic = self.size;
    self.directionPublic = self.direction;
    self.headingOffsetPublic = self.headingOffset;
    self.allowMove = false;

    self.initialize = function () {
        self.updateDirection();
        self.update();
    }
    self.destroy = function (game) {
        game.removeShip(self);
    }
    self.update = function () {
        self.posPublic = self.pos;
        self.sizePublic = self.size;
        self.headingOffsetPublic = self.headingOffset;
        self.directionPublic = self.direction;
    }
    self.discardUpdate = function () {
        self.pos = self.posPublic;
        self.size = self.sizePublic;
        self.headingOffset = self.headingOffsetPublic;
        self.direction = self.directionPublic;
    }
    self.updateDirection = function () {
        // update childOffset
        var temp = self.childOffset[0];
        self.childOffset[0] = self.size[1] - self.childOffset[1];
        self.childOffset[1] = temp;

        // update dimensions
        switch (self.direction) {
            case 0:
                self.size = [50, 150];
                self.headingOffset[0, 0];
                break;

            case 1:
                self.size = [150, 50];
                self.headingOffset = [self.size[0] - 50, self.size[1] - 50];
                break;

            case 2:
                self.size = [50, 150];
                self.headingOffset = [self.size[0] - 50, self.size[1] - 50];
                break;

            case 3:
                self.size = [150, 50];
                self.headingOffset = [0, 0];
                break;
        }
    }
    self.getMoves = function (game) {
        var moves = [];
        var size = [50, 50];
        var color = ["rgba(255,102,102,0.3)", "rgba(102,102,255,0.3)"][self.side - 1];
        var moveDatas = [];

        // get moveDatas of moves based on windDirection
        if (self.allowMove) {
            switch (Math.abs(self.directionPublic - game.windDirection)) {
                case 2:
                    // wind from rear
                    switch (self.directionPublic) {
                        case 0:
                        moveDatas.push([self.posPublic[0], self.posPublic[1] - 50, 0]);
                            break;
                        case 1:
                        moveDatas.push([self.posPublic[0] + 150, self.posPublic[1], 1]);
                            break;
                        case 2:
                        moveDatas.push([self.posPublic[0], self.posPublic[1] + 150, 2]);
                            break;
                        case 3:
                        moveDatas.push([self.posPublic[0] - 50, self.posPublic[1], 3]);
                            break;
                    }
                    break;
                case 1:
                case 3:
                    // wind from side
                    switch (self.directionPublic) {
                        case 0:
                        moveDatas.push([self.posPublic[0], self.posPublic[1] - 50, 0]);

                            if (self.checkCollisionPostTurn(game, [-50, 50], [-50, 0], [0, 50])) {
                                moveDatas.push([self.posPublic[0] - 50, self.posPublic[1] + 50, 3]);
                            }
                            if (self.checkCollisionPostTurn(game, [-50, 50], [-50, 50], [0, 0])) {
                                moveDatas.push([self.posPublic[0] + 50, self.posPublic[1] + 50, 1]);
                            }
                            break;
                        case 1:
                        moveDatas.push([self.posPublic[0] + 150, self.posPublic[1], 1]);
                            if (self.checkCollisionPostTurn(game, [50, -50], [50, -50], [0, 0])) {
                                moveDatas.push([self.posPublic[0] + 50, self.posPublic[1] - 50, 0]);
                            }
                            if (self.checkCollisionPostTurn(game, [50, -50], [0, -50], [50, 0])) {
                                moveDatas.push([self.posPublic[0] + 50, self.posPublic[1] + 50, 2]);
                            }
                            break;
                        case 2:
                        moveDatas.push([self.posPublic[0], self.posPublic[1] + 150, 2]);
                            if (self.checkCollisionPostTurn(game, [-50, 50], [0, 50], [-50, 0])) {
                                moveDatas.push([self.posPublic[0] + 50, self.posPublic[1] + 50, 1]);
                            }
                            if (self.checkCollisionPostTurn(game, [-50, 50], [0, 0], [-50, 50])) {
                                moveDatas.push([self.posPublic[0] - 50, self.posPublic[1] + 50, 3]);
                            }
                            break;
                        case 3:
                        moveDatas.push([self.posPublic[0] - 50, self.posPublic[1], 3]);
                            if (self.checkCollisionPostTurn(game, [50, -50], [0, 0], [50, -50])) {
                                moveDatas.push([self.posPublic[0] + 50, self.posPublic[1] + 50, 2]);
                            }
                            if (self.checkCollisionPostTurn(game, [50, -50], [50, 0], [0, -50])) {
                                moveDatas.push([self.posPublic[0] + 50, self.posPublic[1] - 50, 0]);
                            }
                            break;
                    }
                    break;
            }

            // push moves
            for (var i = 0; i < moveDatas.length; i++) {
                var moveData = moveDatas[i];
                moves.push({
                    pos: [moveData[0], moveData[1]],
                    size: size,
                    direction: moveData[2],
                    color: color
                });
            }
        }

        // push current position
        moves.push({
            pos: self.posPublic,
            size: self.sizePublic,
            color: "rgba(0,0,0,0.3)"
        });

        return moves;
    }
    self.setPosWithOffset = function (pos) {
        self.pos = [(pos[0] - self.childOffset[0]), (pos[1] - self.childOffset[1])];
    }
    self.snapToGrid = function () {
        self.pos = [(Math.round(self.pos[0] / GRID_SIZE) * GRID_SIZE), (Math.round(self.pos[1] / GRID_SIZE) * GRID_SIZE)];
    }
    self.rotate = function (pos) {
        // change direction
        self.direction++;
        if (self.direction == 4) {
            self.direction = 0;
        }

        self.updateDirection();
        self.setPosWithOffset(pos);
    }
    self.isLegalMove = function (game) {
        // no move allowed yet
        if (!game.windDirectionConfirmed) {
            return false;
        }
        
        var moves = self.getMoves(game);

        // check if move is part of the legal moves
        for (var i in moves) {
            var move = moves[i];

            // ship icon is in the move spot, plus the turning variables are the same
            if (move.pos[0] == (self.pos[0] + self.headingOffset[0]) && move.pos[1] == (self.pos[1] + self.headingOffset[1]) && move.direction == self.direction) {
                return true;
            }
        }

        // otherwise illegal
        return false;
    }
    self.collidesWith = function (ship) {
        return (!(self.posPublic[1] + self.sizePublic[1] <= ship.pos[1]
            || self.posPublic[0] >= ship.pos[0] + ship.size[0]
            || self.posPublic[1] >= ship.pos[1] + ship.size[1]
            || self.posPublic[0] + self.sizePublic[0] <= ship.pos[0]));
    }
    self.checkHover = function (pos) {
        if (pos[0] > (self.pos[0])
            && pos[0] < (self.pos[0] + self.size[0])
            && pos[1] > (self.pos[1])
            && pos[1] < (self.pos[1] + self.size[1])) {
            return true;
        }
        return false;
    }
    self.checkCollision = function (game) {
        // check ramming
        for (var i = game.ships.length - 1; i >= 0; i--) {
            var ship = game.ships[i];

            if (self.id != ship.id && ship.collidesWith(self)) {
                return false;
            }
        }
        return true;
    }
    self.checkCollisionPostTurn = function (game, offsetShip, offsetTurnCircle1, offsetTurnCircle2) {
        // check if would ram or turn through
        for (var i = game.ships.length - 1; i >= 0; i--) {
            var ship = game.ships[i];

            // check if would ram
            if (self.id != ship.id && ship.collidesWith({ pos: [self.posPublic[0] + offsetShip[0], self.posPublic[1] + offsetShip[1]], size: [self.sizePublic[1], self.sizePublic[0]] })) {
                return false;
            }

            // check if would turn through
            if (self.id != ship.id && (ship.collidesWith({ pos: [self.posPublic[0] + offsetTurnCircle1[0], self.posPublic[1] + offsetTurnCircle1[1]], size: [100, 100] }) || ship.collidesWith({ pos: [self.posPublic[0] + offsetTurnCircle2[0], self.posPublic[1] + offsetTurnCircle2[1]], size: [100, 100] }))) {
                return false;
            }
        }
        return true;
    }
    self.checkDestroy = function (game) {
        // out of bounds
        if (self.posPublic[0] < 0 || self.posPublic[0] + self.size[0] > 500 || self.posPublic[1] < 0 || self.posPublic[1] + self.size[1] > 500) {
            self.destroy(game);
        }

        // check ramming
        for (var i = game.ships.length - 1; i >= 0; i--) {
            var ship = game.ships[i];

            if (self != ship && self.collidesWith(ship)) {
                ship.destroy(game);
            }
        }
    }

    self.initialize();
    return self;
}
Ship.spawn = function (id, gridX, gridY, direction, side) {
    var pos = [gridX * 50, gridY * 50];

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
    var ship = Ship(id, pos, direction, side);

    return ship;
}

// GAME
var Game = function (name) {
    var self = {
        id: nextGameID,
        name: name,
        clients: [],
        player1: null,
        player2: null,
        ships: [],
        nextShipID: 0,
        windDirection: 0,
        windDirectionConfirmed: false,
        initiative: 1,
        windDirectionPublic: 0
    }
    self.initialize = function () {
        nextGameID++;
        GAME_LIST.push(self);
        self.spawnShips();
        self.resetAllowMove();
        console.log("\x1b[7m%s\x1b[0m", "Game '" + self.id + "' started.");
    }
    self.restart = function () {
        self.initiative = 1;
        self.spawnShips();
        console.log("\x1b[7m%s\x1b[0m", "Game '" + game.id + "' reset.");
    }
    self.spawnShips = function () {
        self.ships = [];
        [[1, 5, 0, 2], [5, 8, 3, 2], [2, 1, 1, 1], [8, 2, 2, 1]].forEach(element => {
            var ship = Ship.spawn(self.nextShipID, element[0], element[1], element[2], element[3]);
            self.nextShipID++;
            self.ships.push(ship);
        });
    }
    self.removeShip = function (ship) {
        self.ships = self.ships.filter(element => element != ship);
    }
    self.getPackage = function (client) {
        var package = [[]];
        var allShipsMoved = true;

        // add data of all ships to the package
        for (var i in self.ships) {
            var ship = self.ships[i];
            var pos = ship.posPublic;
            var size = ship.sizePublic;
            var headingOffset = ship.headingOffsetPublic;
            var moves = [];

            // if the ship belongs to the player, change what's pushed
            if ((ship.side == 1 && game.player1 != null && game.player1.id == client.id) || (ship.side == 2 && game.player2 != null && game.player2.id == client.id)) {
                pos = ship.pos;
                size = ship.size;
                headingOffset = ship.headingOffset;

                moves = ship.getMoves(self);
            }

            // if the ship hasn't moved yet, not all have moved
            if (ship.allowMove) {
                allShipsMoved = false;
            }

            package[0].push({
                pos: pos,
                size: size,
                headingOffset: headingOffset,
                side: ship.side,
                hasInitiative: (ship.side == self.initiative),
                moves: moves,
                color: ["rgba(255,102,102,1)", "rgba(102,102,255,1)"][ship.side - 1]
            });
        }

        // add game data to the package
        package.push({
            player1: self.player1,
            player2: self.player2,
            initiative: self.initiative,
            hasInitiative: ((self.player1 != null && self.player1.id == client.id) && self.initiative == 1) || ((self.player2 != null && self.player2.id == client.id) && self.initiative == 2),
            windDirection: self.windDirection,
            windDirectionPublic: self.windDirectionPublic,
            windDirectionConfirmed: self.windDirectionConfirmed,
            allShipsMoved: allShipsMoved
        });

        return package;
    }
    self.checkHover = function (pos, playerID) {
        for (var i = self.ships.length - 1; i >= 0; i--) {
            var ship = self.ships[i];

            if (((ship.side == 1 && game.player1 != null && game.player1.id == playerID) || (ship.side == 2 && game.player2 != null && game.player2.id == playerID)) && ship.side == self.initiative && ship.checkHover(pos)) {
                return ship;
            }
        }
        return null;
    }
    self.popShip = function (ship) {
        self.removeShip(ship);
        self.ships.push(ship);
    }
    self.onDisconnect = function (client) {
        self.clients = self.clients.filter(element => element.id != client.id);

        if (self.player1 != null && self.player1.id == client.id) {
            self.player1 = null;
            console.log("\x1b[37m%s\x1b[0m", "Game '" + self.id + "' left by Client '" + client.id + "' as Player1.");
        } else if (self.player2 != null && self.player2.id == client.id) {
            self.player2 = null;
            console.log("\x1b[37m%s\x1b[0m", "Game '" + self.id + "' left by Client '" + client.id + "' as Player2.");
        } else {
            console.log("\x1b[37m%s\x1b[0m", "Game '" + self.id + "' left by Client '" + client.id + "' as Spectator.");
        }

        // stop game if no clients are remaining
        if (self.clients.length == 0) {
            self.destroy();
        }
    }
    self.destroy = function () {
        GAME_LIST = GAME_LIST.filter(element => element.id != self.id);
        Game.emitList();

        console.log("\x1b[7m%s\x1b[0m", "Game '" + self.id + "' stopped.");
    }
    self.changeWind = function (direction) {
        self.windDirection = direction;
    }
    self.confirmWind = function () {
        self.windDirectionPublic = self.windDirection;

        for (var i in self.ships) {
            var ship = self.ships[i];

            if (ship.directionPublic == self.windDirectionPublic) {
                ship.allowMove = false;
            }
        }
    }
    self.changeInitiative = function () {
        if (self.initiative == 1) {
            self.initiative = 2;
        } else {
            self.initiative = 1;
        }
        self.windDirectionConfirmed = false;

        for (var i in self.ships) {
            var ship = self.ships[i];

            if (self.initiative == ship.side) {
                self.popShip(ship);
            }
        }

        game.resetAllowMove();
    }
    self.resetAllowMove = function () {
        for (var i = 0; i < self.ships.length; i++) {
            var ship = self.ships[i];

            if (ship.side == self.initiative) {
                ship.allowMove = true;
            }
        }
    }

    self.initialize();
    return self;
}
Game.fetchList = function () {
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
Game.emitList = function () {
    var menuScreenData = Game.fetchList();

    for (var i in CLIENT_LIST) {
        CLIENT_LIST[i].emit('menuScreenData', menuScreenData);
    }
}
Game.create = function (name) {
    game = Game(name);
    Game.emitList();

    return game;
}
Game.findWithID = function (id) {
    for (i in GAME_LIST) {
        var game = GAME_LIST[i];

        if (game.id == id) {
            return game;
        }
    }

    return null;
}
Game.findWithPlayer = function (player) {
    // find the game the player was in
    for (var i = GAME_LIST.length - 1; i >= 0; i--) {
        var game = GAME_LIST[i];

        for (var j = game.clients.length - 1; j >= 0; j--) {
            var client = game.clients[j];

            if (player.id == client.id) {
                return game;
            }
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
var GRID_SIZE = 50;

// start loop which ticks every 40ms
setInterval(function () {
    for (var i in GAME_LIST) {
        var game = GAME_LIST[i];

        // send all clients the package
        for (var i in game.clients) {
            var client = game.clients[i];
            var gameData = game.getPackage(client);

            client.emit('gameData', gameData);
        }
    }
}, 1000 / 50);