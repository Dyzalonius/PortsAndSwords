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

// connect to the server
var client = io();

////////////////////////////////////////
//        INITIALIZE ELEMENTS         //
////////////////////////////////////////

$(document).ready(function () {
    $("#buttonLogin").click(() => {
        if ($("#fieldLoginName").val().length >= 3) {
            client.emit('login', { name: $("#fieldLoginName").val() });

            $("#loginScreen").css("display", "none");
            $("#menuScreen").css("display", "block");
            $("#gameScreen").css("display", "none");
            $("#fieldGameCreateName").val($("#fieldLoginName").val() + "'s game");
        } else {
            alert('Name needs to be atleast 3 characters');
        }
    });

    $("#buttonGameCreate").click(() => {
        if ($("#fieldGameCreateName").val().length >= 3) {
            client.emit('gameCreate', { name: $("#fieldGameCreateName").val() });

            $("#loginScreen").css("display", "none");
            $("#menuScreen").css("display", "none");
            $("#gameScreen").css("display", "block");
            $("#textGameName").html($("#fieldGameCreateName").val());
        } else {
            alert('Name needs to be atleast 3 characters');
        }
    });

    $("#buttonGameLeave").click(() => {
        client.emit('gameLeave');


        $("#loginScreen").css("display", "none");
        $("#menuScreen").css("display", "block");
        $("#gameScreen").css("display", "none");
    });

});

////////////////////////////////////////
//            HANDLE GAME             //
////////////////////////////////////////

// listen for data
client.on('gameData', function (data) {
    BOARD_OFFSET_X = document.getElementById("ctx").getBoundingClientRect().left;
    BOARD_OFFSET_Y = document.getElementById("ctx").getBoundingClientRect().top;

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

    // clear screen
    ctx.clearRect(0, 0, 500, 500);

    // draw grid
    for (var i = 0; i < 10; i++) {
        for (var j = 0; j < 10; j++) {
            ctx.strokeRect(i * 50, j * 50, (i + 1) * 50, (j + 1) * 50);
        }
    }

    // draw anchors
    [[0, 8, 0], [0, 9, 0], [1, 9, 0], [8, 0, 1], [9, 0, 1], [9, 1, 1]].forEach(element => {
        var width = 50;
        var height = 50;

        var img = Img.anchorBlue;
        if (element[2] == 1) {
            img = Img.anchorRed;
        }

        ctx.drawImage(img, 0, 0, img.width, img.height, element[0] * 50, element[1] * 50, width, height);
    });

    // draw ships
    for (var i = 0; i < data[0].length; i++) {
        var ship = data[0][i];

        var width = 50;
        var height = 50;
        var img = Img.ramBlue;
        var fill = "#8888FF";

        if (ship.side) {
            img = Img.ramRed;
            fill = "#FF8888";
        }

        ctx.fillStyle = fill;
        ctx.fillRect(ship.posX, ship.posY, ship.width, ship.height);

        ctx.drawImage(img, -10, -10, (img.width + 20), (img.height + 20), (ship.posX + ship.headingOffsetX), (ship.posY + ship.headingOffsetY), width, height);
    };
});

////////////////////////////////////////
//            HANDLE MENU             //
////////////////////////////////////////

// listen for menu data
client.on('menuData', function (data) {
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