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
Img.windN = new Image();
Img.windN.src = '/client/img/windN.png';
Img.windE = new Image();
Img.windE.src = '/client/img/windE.png';
Img.windS = new Image();
Img.windS.src = '/client/img/windS.png';
Img.windW = new Image();
Img.windW.src = '/client/img/windW.png';

// define context
var ctx = document.getElementById("ctx").getContext("2d");
ctx.font = '30px Arial';
var BOARD_OFFSET_X = 0;
var BOARD_OFFSET_Y = 0;
var GRID_LINE_WEIGHT = 1;
var GRID_CELL_SIZE = 50;
var GRID_SIZE = 10;
var GRID_OFFSET = GRID_CELL_SIZE * 2;
var GRID_COLOR = "#222222";
var windOffset = 0;

// connect to the server
var client = io();

////////////////////////////////////////
//        INITIALIZE ELEMENTS         //
////////////////////////////////////////

$(document).ready(function () {
    $("#buttonLogin").click(() => {
        var nicknameLength = $("#fieldLoginName").val().length;

        if (nicknameLength >= 3 && nicknameLength <= 14) {
            client.emit('login', { name: $("#fieldLoginName").val() });

            $("#loginScreen").css("display", "none");
            $("#menuScreen").css("display", "block");
            $("#gameScreen").css("display", "none");
            $("#fieldGameCreateName").val($("#fieldLoginName").val() + "'s game");
        } else {
            alert('Name needs to be 3 to 14 characters');
        }
    });

    $("#buttonGameCreate").click(() => {
        var gameNameLength = $("#fieldGameCreateName").val().length;
        if (gameNameLength >= 3 && gameNameLength <= 32) {
            client.emit('gameCreate', { name: $("#fieldGameCreateName").val() });

            $("#loginScreen").css("display", "none");
            $("#menuScreen").css("display", "none");
            $("#gameScreen").css("display", "block");
            $("#textGameName").html($("#fieldGameCreateName").val());
        } else {
            alert('Name needs to be 3 to 32 characters');
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

    // set turn text
    $("#textGameTurn").html(turnText);

    // MOVE ALL THOSE THINGS (^^^) TO A SEPERATE EMIT&LISTEN

    // clear screen
    ctx.clearRect(0, 0, 700, 700);

    // edit wind boxes and text if it's the wind direction
    var visibleWindDirection = data[1].windDirectionPublic;
    if (data[1].hasInitiative) {
        visibleWindDirection = data[1].windDirection;
    }

    // draw wind
    switch (visibleWindDirection) {
        case 0:
            ctx.drawImage(Img.windN, 0, GRID_CELL_SIZE * GRID_SIZE - windOffset, GRID_CELL_SIZE * GRID_SIZE, windOffset, GRID_OFFSET, GRID_OFFSET, GRID_CELL_SIZE * GRID_SIZE, windOffset);
            ctx.drawImage(Img.windN, 0, 0, GRID_CELL_SIZE * GRID_SIZE, GRID_CELL_SIZE * GRID_SIZE - windOffset, GRID_OFFSET, GRID_OFFSET + windOffset, GRID_CELL_SIZE * GRID_SIZE, GRID_CELL_SIZE * GRID_SIZE - windOffset);
            break; //NOT DONE

        case 1:
            ctx.drawImage(Img.windE, windOffset, 0, GRID_CELL_SIZE * GRID_SIZE - windOffset, GRID_CELL_SIZE * GRID_SIZE, GRID_OFFSET, GRID_OFFSET, GRID_CELL_SIZE * GRID_SIZE - windOffset, GRID_CELL_SIZE * GRID_SIZE);
            ctx.drawImage(Img.windE, 0, 0, windOffset, GRID_CELL_SIZE * GRID_SIZE, GRID_OFFSET + GRID_CELL_SIZE * GRID_SIZE - windOffset, GRID_OFFSET, windOffset, GRID_CELL_SIZE * GRID_SIZE);
            break;

        case 2:
            ctx.drawImage(Img.windS, 0, windOffset, GRID_CELL_SIZE * GRID_SIZE, GRID_CELL_SIZE * GRID_SIZE - windOffset, GRID_OFFSET, GRID_OFFSET, GRID_CELL_SIZE * GRID_SIZE, GRID_CELL_SIZE * GRID_SIZE - windOffset);
            ctx.drawImage(Img.windS, 0, 0, GRID_CELL_SIZE * GRID_SIZE, windOffset, GRID_OFFSET, GRID_OFFSET + GRID_CELL_SIZE * GRID_SIZE - windOffset, GRID_CELL_SIZE * GRID_SIZE, windOffset);
            break;

        case 3:
            ctx.drawImage(Img.windW, GRID_CELL_SIZE * GRID_SIZE - windOffset, 0, windOffset, GRID_CELL_SIZE * GRID_SIZE, GRID_OFFSET, GRID_OFFSET, windOffset, GRID_CELL_SIZE * GRID_SIZE);
            ctx.drawImage(Img.windW, 0, 0, GRID_CELL_SIZE * GRID_SIZE - windOffset, GRID_CELL_SIZE * GRID_SIZE, GRID_OFFSET + windOffset, GRID_OFFSET, GRID_CELL_SIZE * GRID_SIZE - windOffset, GRID_CELL_SIZE * GRID_SIZE);
            break;
    }
    // increment windOffset
    windOffset++;
    if (windOffset >= 500) {
        windOffset = 0;
    }

    // draw grid exterior
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 4;
    ctx.strokeRect(GRID_OFFSET - 1, GRID_OFFSET - 1, GRID_CELL_SIZE * GRID_SIZE + 2, GRID_CELL_SIZE * GRID_SIZE + 2);

    ctx.lineWidth = 8;
    ctx.strokeRect(GRID_OFFSET - 10, GRID_OFFSET - 10, GRID_CELL_SIZE * GRID_SIZE + 20, GRID_CELL_SIZE * GRID_SIZE + 20);
    ctx.lineWidth = 1;

    // draw wind boxes
    ctx.fillStyle = GRID_COLOR;
    ctx.fillRect(GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) - GRID_CELL_SIZE, GRID_OFFSET - GRID_CELL_SIZE * 2, GRID_CELL_SIZE * 2, GRID_CELL_SIZE * 2);
    ctx.fillRect(GRID_OFFSET + GRID_CELL_SIZE * GRID_SIZE, GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) - GRID_CELL_SIZE, GRID_CELL_SIZE * 2, GRID_CELL_SIZE * 2);
    ctx.fillRect(GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) - GRID_CELL_SIZE, GRID_OFFSET + GRID_CELL_SIZE * GRID_SIZE, GRID_CELL_SIZE * 2, GRID_CELL_SIZE * 2);
    ctx.fillRect(GRID_OFFSET - GRID_CELL_SIZE * 2, GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) - GRID_CELL_SIZE, GRID_CELL_SIZE * 2, GRID_CELL_SIZE * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) - GRID_CELL_SIZE + 10, GRID_OFFSET - GRID_CELL_SIZE * 2 + 10, GRID_CELL_SIZE * 2 - 20, GRID_CELL_SIZE * 2 - 20);
    ctx.fillRect(GRID_OFFSET + GRID_CELL_SIZE * GRID_SIZE + 10, GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) - GRID_CELL_SIZE + 10, GRID_CELL_SIZE * 2 - 20, GRID_CELL_SIZE * 2 - 20);
    ctx.fillRect(GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) - GRID_CELL_SIZE + 10, GRID_OFFSET + GRID_CELL_SIZE * GRID_SIZE + 10, GRID_CELL_SIZE * 2 - 20, GRID_CELL_SIZE * 2 - 20);
    ctx.fillRect(GRID_OFFSET - GRID_CELL_SIZE * 2 + 10, GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) - GRID_CELL_SIZE + 10, GRID_CELL_SIZE * 2 - 20, GRID_CELL_SIZE * 2 - 20);

    // draw wind text
    ctx.font = "50px Georgia";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.fillText("E", GRID_OFFSET + GRID_CELL_SIZE * GRID_SIZE + GRID_CELL_SIZE, GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) + 15);
    ctx.fillText("S", GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2), GRID_OFFSET + GRID_CELL_SIZE * GRID_SIZE + GRID_CELL_SIZE + 15);
    ctx.fillText("W", GRID_OFFSET - GRID_CELL_SIZE, GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) + 15);
    ctx.fillText("N", GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2), GRID_OFFSET - GRID_CELL_SIZE + 15);

    switch (visibleWindDirection) {
        case 0:
            ctx.fillStyle = GRID_COLOR;
            ctx.fillRect(GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) - GRID_CELL_SIZE + 10, GRID_OFFSET - GRID_CELL_SIZE * 2 + 10, GRID_CELL_SIZE * 2 - 20, GRID_CELL_SIZE * 2 - 20);
            ctx.fillStyle = "white";
            ctx.fillText("N", GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2), GRID_OFFSET - GRID_CELL_SIZE + 15);
            break;
        case 1:
            ctx.fillStyle = GRID_COLOR;
            ctx.fillRect(GRID_OFFSET + GRID_CELL_SIZE * GRID_SIZE + 10, GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) - GRID_CELL_SIZE + 10, GRID_CELL_SIZE * 2 - 20, GRID_CELL_SIZE * 2 - 20);
            ctx.fillStyle = "white";
            ctx.fillText("E", GRID_OFFSET + GRID_CELL_SIZE * GRID_SIZE + GRID_CELL_SIZE, GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) + 15);
            break;
        case 2:
            ctx.fillStyle = GRID_COLOR;
            ctx.fillRect(GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) - GRID_CELL_SIZE + 10, GRID_OFFSET + GRID_CELL_SIZE * GRID_SIZE + 10, GRID_CELL_SIZE * 2 - 20, GRID_CELL_SIZE * 2 - 20);
            ctx.fillStyle = "white";
            ctx.fillText("S", GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2), GRID_OFFSET + GRID_CELL_SIZE * GRID_SIZE + GRID_CELL_SIZE + 15);
            break;
        case 3:
            ctx.fillStyle = GRID_COLOR;
            ctx.fillRect(GRID_OFFSET - GRID_CELL_SIZE * 2 + 10, GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) - GRID_CELL_SIZE + 10, GRID_CELL_SIZE * 2 - 20, GRID_CELL_SIZE * 2 - 20);
            ctx.fillStyle = "white";
            ctx.fillText("W", GRID_OFFSET - GRID_CELL_SIZE, GRID_OFFSET + GRID_CELL_SIZE * (GRID_SIZE / 2) + 15);
            break;
    }

    // draw grid interior
    ctx.strokeStyle = GRID_COLOR;
    for (var i = 0; i < 10; i++) {
        for (var j = 0; j < 10; j++) {
            ctx.strokeRect(GRID_OFFSET + i * GRID_CELL_SIZE, GRID_OFFSET + j * GRID_CELL_SIZE, GRID_CELL_SIZE, GRID_CELL_SIZE);
        }
    }

    // draw anchors
    [[8, 0, 1], [9, 0, 1], [9, 1, 1], [0, 8, 2], [0, 9, 2], [1, 9, 2]].forEach(element => {
        var img = [Img.anchorRed, Img.anchorBlue][element[2] - 1];

        ctx.drawImage(img, 0, 0, img.width, img.height, GRID_OFFSET + element[0] * GRID_CELL_SIZE + GRID_LINE_WEIGHT, GRID_OFFSET + element[1] * GRID_CELL_SIZE + GRID_LINE_WEIGHT, GRID_CELL_SIZE - GRID_LINE_WEIGHT * 2, GRID_CELL_SIZE - GRID_LINE_WEIGHT * 2);
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
                ctx.fillRect(GRID_OFFSET + move.pos[0] + GRID_LINE_WEIGHT, GRID_OFFSET + move.pos[1] + GRID_LINE_WEIGHT, move.size[0] - GRID_LINE_WEIGHT * 2, move.size[1] - GRID_LINE_WEIGHT * 2);
            }
        }

        // draw hull
        ctx.fillStyle = ship.color;
        ctx.fillRect(GRID_OFFSET + ship.pos[0] + GRID_LINE_WEIGHT, GRID_OFFSET + ship.pos[1] + GRID_LINE_WEIGHT, ship.size[0] - GRID_LINE_WEIGHT * 2, ship.size[1] - GRID_LINE_WEIGHT * 2);

        // draw icon
        ctx.drawImage(img, -10, -10, (img.width + 20), (img.height + 20), GRID_OFFSET + (ship.pos[0] + ship.headingOffset[0]) + GRID_LINE_WEIGHT, GRID_OFFSET + (ship.pos[1] + ship.headingOffset[1]) + GRID_LINE_WEIGHT, GRID_CELL_SIZE - GRID_LINE_WEIGHT * 2, GRID_CELL_SIZE - GRID_LINE_WEIGHT * 2);
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
    BOARD_OFFSET_X = GRID_OFFSET + document.getElementById("ctx").getBoundingClientRect().left;
    BOARD_OFFSET_Y = GRID_OFFSET + document.getElementById("ctx").getBoundingClientRect().top;

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