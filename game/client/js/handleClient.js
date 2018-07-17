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
var BOARD_OFFSET_X = 8;
var BOARD_OFFSET_Y = 8;

// connect to the server
var client = io();

////////////////////////////////////////
//        INITIALIZE ELEMENTS         //
////////////////////////////////////////

$(document).ready(function () {
    $("#buttonGameCreate").click(() => {
        client.emit('gameCreate');

        $("#menuWrapper").css("display", "none");
        $("#gameWrapper").css("display", "block");
    });

    $("#buttonGameLeave").click(() => {
        client.emit('gameLeave');

        $("#menuWrapper").css("display", "block");
        $("#gameWrapper").css("display", "none");
    });

});

////////////////////////////////////////
//            HANDLE GAME             //
////////////////////////////////////////

// listen for data
client.on('gameData', function (data) {
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
    for (var i = 0; i < data.length; i++) {
        var ship = data[i];

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

    // Fill gameList
    for (let i = 0; i < data.length; i++) {
        let game = data[i];

        // Create entry for the game
        $("#gameList").append(`
            <div>
                game.name
                <button id="buttonGameJoin-${game.id}" class="gameJoin" value=${game.id}>Join game</button>
            </div>`
        );

        // Bind the join button to the game
        $("#buttonGameJoin-" + game.id).click(() => {
            client.emit('gameJoin', { gameID: game.id });

            $("#menuWrapper").css("display", "none");
            $("#gameWrapper").css("display", "block");
        });
    }
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
    client.emit('mouseDown', { posX: event.clientX - BOARD_OFFSET_Y, posY: event.clientY - BOARD_OFFSET_Y });

    // start emit input mousePos
    document.addEventListener('mousemove', mouseMove = function (event) {
        client.emit('mousePos', { posX: event.clientX - BOARD_OFFSET_Y, posY: event.clientY - BOARD_OFFSET_Y });
    }, false);
}

// stop emit input mousePos
document.onmouseup = function (event) {
    document.removeEventListener('mousemove', mouseMove, false);
    client.emit('mouseUp');
}