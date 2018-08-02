////////////////////////////////////////
//        INITIALIZE VARIABLES        //
////////////////////////////////////////

// define images
var Img = {};
Img.anchorBlue = new Image();
Img.anchorBlue.src = '/client/img/anchor_blue.png';
Img.anchorRed = new Image();
Img.anchorRed.src = '/client/img/anchor_red.png';
Img.ramBlue = new Image();
Img.ramBlue.src = '/client/img/ram_blue.png';
Img.ramRed = new Image();
Img.ramRed.src = '/client/img/ram_red.png';

// define context
var ctx = document.getElementById("ctx").getContext("2d");
ctx.font = '30px Arial';
var BOARD_OFFSET_X = 0;
var BOARD_OFFSET_Y = 0;
var GRID_LINE_WEIGHT = 1;
var GRID_CELL_SIZE = 50;
var GRID_SIZE = 10;
var GRID_COLOR = "#000000";

// connect to the server
var client = io();

////////////////////////////////////////
//        INITIALIZE ELEMENTS         //
////////////////////////////////////////

$(document).ready(function () {
    $("#buttonLogin").click(() => {
        var nicknameLength = $("#fieldLoginName").val().length;

        if (nicknameLength >= 3 && nicknameLength <= 12) {
            client.emit('login', { name: $("#fieldLoginName").val() });

            $("#loginScreen").css("display", "none");
            $("#menuScreen").css("display", "block");
            $("#gameScreen").css("display", "none");
            $("#fieldGameCreateName").val($("#fieldLoginName").val() + "'s game");
        } else {
            alert('Name needs to be 3 to 12 characters');
        }
    });

    $("#buttonGameCreate").click(() => {
        var gameNameLength = $("#fieldGameCreateName").val().length;
        if (gameNameLength >= 3 && gameNameLength <= 25) {
            client.emit('gameCreate', { name: $("#fieldGameCreateName").val() });

            $("#loginScreen").css("display", "none");
            $("#menuScreen").css("display", "none");
            $("#gameScreen").css("display", "block");
            $("#textGameName").html($("#fieldGameCreateName").val());
        } else {
            alert('Name needs to be 3 to 25 characters');
        }
    });

    $("#buttonGameLeave").click(() => {
        client.emit('gameLeave');


        $("#loginScreen").css("display", "none");
        $("#menuScreen").css("display", "block");
        $("#gameScreen").css("display", "none");
    });

    $(".buttonGameWind").click(function () {
        client.emit('wind', { request: $(this).text() });
    });
});

////////////////////////////////////////
//             GAME DATA              //
////////////////////////////////////////

// listen for data
client.on('gameData', function (data) {
    if (!data[1].windDirectionConfirmed) {
        // enable step 1
        $("#textGameStep1").css("color", "black");
        $(".buttonGameWind").removeAttr("disabled");

        // disable step 2
        $("#textGameStep2").css("color", "lightgray");
    } else {
        // enable steps 2
        $("#textGameStep2").css("color", "black");

        // disable step 1
        $("#textGameStep1").css("color", "lightgray");
        $(".buttonGameWind").attr("disabled", "disabled");
    }

    // enable or disable buttons
    if (!data[1].hasInitiative) {
        //  disable steps 1 and 2
        $("#textGameStep1").css("color", "lightgray");
        $(".buttonGameWind").attr("disabled", "disabled");
        $("#textGameStep2").css("color", "lightgray");
    }

    // set name of player1
    if (data[1].player1 != null) {
        $("#textGamePlayer1").html(data[1].player1.name);
    } else {
        $("#textGamePlayer1").html("[Player 1]");
    }

    // set name of player2
    if (data[1].player2 != null) {
        $("#textGamePlayer2").html(data[1].player2.name);
    } else {
        $("#textGamePlayer2").html("[Player 2]");
    }

    var windDirection = ["N", "E", "S", "W"][data[1].windDirection];
    var windDirectionPublic = ["N", "E", "S", "W"][data[1].windDirectionPublic];

    // get turn text
    var turnText = "";
    if (data[1].initiative == 1) {
        if (data[1].player1 != null) {
            turnText = data[1].player1.name + "'s turn";
        } else {
            turnText = "[Player 1]'s turn";
        }
    } else {
        if (data[1].player2 != null) {
            turnText = data[1].player2.name + "'s turn";
        } else {
            turnText = "[Player 2]'s turn";
        }
    }
    var windText = "(windDirection: " + windDirectionPublic + ")";

    if (data[1].hasInitiative) {
        windText = "(windDirection: " + windDirection + ")";
    }

    // set turn text
    $("#textGameTurn").html(turnText + `<br>` + windText);

    // MOVE ALL THOSE THINGS (^^^) TO A SEPERATE EMIT&LISTEN

    // clear screen
    ctx.clearRect(0, 0, 600, 600);

    // draw grid
    ctx.strokeStyle = GRID_COLOR;
    ctx.strokeRect(GRID_CELL_SIZE, GRID_CELL_SIZE, GRID_CELL_SIZE * GRID_SIZE, GRID_CELL_SIZE * GRID_SIZE);
    for (var i = 0; i < 10; i++) {
        for (var j = 0; j < 10; j++) {
            ctx.strokeRect(GRID_CELL_SIZE + i * GRID_CELL_SIZE, GRID_CELL_SIZE + j * GRID_CELL_SIZE, GRID_CELL_SIZE, GRID_CELL_SIZE);
        }
    }

    // draw anchors
    [[8, 0, 1], [9, 0, 1], [9, 1, 1], [0, 8, 2], [0, 9, 2], [1, 9, 2]].forEach(element => {
        var img = [Img.anchorRed, Img.anchorBlue][element[2] - 1];

        ctx.drawImage(img, 0, 0, img.width, img.height, GRID_CELL_SIZE + element[0] * GRID_CELL_SIZE + GRID_LINE_WEIGHT, GRID_CELL_SIZE + element[1] * GRID_CELL_SIZE + GRID_LINE_WEIGHT, GRID_CELL_SIZE - GRID_LINE_WEIGHT * 2, GRID_CELL_SIZE - GRID_LINE_WEIGHT * 2);
    });

    // draw ships
    for (var i = 0; i < data[0].length; i++) {
        var ship = data[0][i];
        var img = [Img.ramRed, Img.ramBlue][ship.side - 1];

        // draw move options if ship has initiative
        if (ship.hasInitiative) {
            for (var j = 0; j < ship.moves.length; j++) {
                var move = ship.moves[j];

                ctx.fillStyle = move.color;
                ctx.fillRect(GRID_CELL_SIZE + move.pos[0] + GRID_LINE_WEIGHT, GRID_CELL_SIZE + move.pos[1] + GRID_LINE_WEIGHT, move.size[0] - GRID_LINE_WEIGHT * 2, move.size[1] - GRID_LINE_WEIGHT * 2);
            }
        }

        // draw hull
        ctx.fillStyle = ship.color;
        ctx.fillRect(GRID_CELL_SIZE + ship.pos[0] + GRID_LINE_WEIGHT, GRID_CELL_SIZE + ship.pos[1] + GRID_LINE_WEIGHT, ship.size[0] - GRID_LINE_WEIGHT * 2, ship.size[1] - GRID_LINE_WEIGHT * 2);

        // draw icon
        ctx.drawImage(img, -10, -10, (img.width + 20), (img.height + 20), GRID_CELL_SIZE + (ship.pos[0] + ship.headingOffset[0]) + GRID_LINE_WEIGHT, GRID_CELL_SIZE + (ship.pos[1] + ship.headingOffset[1]) + GRID_LINE_WEIGHT, GRID_CELL_SIZE - GRID_LINE_WEIGHT * 2, GRID_CELL_SIZE - GRID_LINE_WEIGHT * 2);
    };
});

////////////////////////////////////////
//            GAME SCREEN             //
////////////////////////////////////////

// listen for game screen data
// client.on('gameScreenData', function (data) {
// });

////////////////////////////////////////
//            MENU SCREEN             //
////////////////////////////////////////

// listen for menu screen data
client.on('menuScreenData', function (data) {
    // Empty gameList
    $("#gameList").empty();
    $("#gameList").append(`<hr><br>`);

    // Fill gameList
    if (data.length > 0) {
        for (let i = 0; i < data.length; i++) {
            let game = data[i];

            // Create entry for the game
            $("#gameList").append(`
            <div class="gameListItem">
                <label id="menuGameName-${game.id}">${game.name}</label> <button id="buttonGameJoin-${game.id}" class="gameJoin" value=${game.id}>Join game</button>
            </div>`
            );

            // Bind the join button to the game
            $("#buttonGameJoin-" + game.id).click(() => {
                client.emit('gameJoin', { gameID: game.id });

                $("#menuScreen").css("display", "none");
                $("#gameScreen").css("display", "block");
                $("#textGameName").html($("#menuGameName-" + game.id).html());
            });
        }
    } else {
        $("#gameList").append(`<br>`);
    }

    $("#gameList").append(`<br><hr>`);
});

////////////////////////////////////////
//            HANDLE INPUT            //
////////////////////////////////////////

// emit input onkeydown
document.onkeydown = function (event) {
    if (event.keyCode === 82) {
        client.emit('keyPress', { inputId: 'R' });
    }
    if (event.keyCode === 79) {
        client.emit('keyPress', { inputId: 'O' });
    }
}

// emit input mousedown
document.onmousedown = function (event) {
    BOARD_OFFSET_X = GRID_CELL_SIZE + document.getElementById("ctx").getBoundingClientRect().left;
    BOARD_OFFSET_Y = GRID_CELL_SIZE + document.getElementById("ctx").getBoundingClientRect().top;

    client.emit('mouseDown', { posX: event.clientX - BOARD_OFFSET_X, posY: event.clientY - BOARD_OFFSET_Y });

    // start emit input mousePos
    document.addEventListener('mousemove', mouseMove = function (event) {
        client.emit('mousePos', { posX: event.clientX - BOARD_OFFSET_X, posY: event.clientY - BOARD_OFFSET_Y });
    }, false);
}

// stop emit input mousePos
document.onmouseup = function (event) {
    document.removeEventListener('mousemove', mouseMove, false);
    client.emit('mouseUp');
}