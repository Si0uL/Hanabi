var express = require('express');

var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    fs = require('fs'),
    ent = require('ent');

var angles_array = function(hand) {
    var to_return = [];
    hand.forEach(function(elt) {
        if (!elt) {
            to_return.push(-1);
        } else {
            to_return.push(-elt.angle);
        }
    });
    return to_return
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// Beginning of main

var ip = process.argv[2];
var port = Number(process.argv[3]);

// Parse passwords.JSON
var recorded;
var passwords = JSON.parse(fs.readFileSync('./data/passwords.json'));

fs.readFile(process.argv[4], 'utf8', function(err, data) {

    if (err) throw "Impossible to find your history file!";
    recorded = JSON.parse(data);
    var gameData = recorded.gameDataInit;
    var turns = recorded.turns;
    gameData.eventIndex = 0;

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // Express Routes
    app.use(express.static('views'))

    .get('/game', function(req, res) {
        res.render('game_screen.ejs', {replayMode: true, cardsPerPlayer: recorded.gameDataInit.cardsPerPlayer, address: ip + ':' + port});
    })

    /* On redirige vers la todolist si la page demandée n'est pas trouvée */
    .use(function(req, res, next){
        res.redirect('/game');
    });

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // EventListeners
    io.sockets.on('connection', function (socket) {

        console.log("connection");

        socket.on('nouveau_client', function (pseudo) {
            if (pseudo != null) pseudo = ent.encode(pseudo);
            if (pseudo in passwords) {

                socket.emit('pseudo_ok');
                socket.pseudo = pseudo;

                socket.on('login', function(pwd) {
                    if (pwd != null) pwd = ent.encode(pwd);
                    if (pwd == passwords[socket.pseudo]) {

                        //!!!!!!!!!!!!!!!!!!!
                        //Etering The main
                        var to_send = JSON.parse(JSON.stringify(gameData));

                        socket.emit('init', to_send);
                        socket.emit('next_turn', {playerUp: gameData.nextToPlay, game_mode: false, lastPlay: gameData.lastPlay});
                        console.log(socket.pseudo,"logged in.");

                        var nextEvent = function() {
                            console.log(gameData.turn);
                            if (gameData.turn == turns.length - 1) {
                                socket.emit('notify', 'You already reached max. turn');
                            } else {
                                var elt = turns[gameData.turn][gameData.eventIndex];
                                console.log(elt.event);
                                console.log(elt.data);
                                switch (elt.event) {
                                    case 'info':
                                        if (elt.data == 'add') {
                                            gameData.informations ++;
                                        } else {
                                            gameData.informations --;
                                        }
                                        socket.emit('info', elt.data);
                                        socket.broadcast.emit('info', elt.data);
                                        break;
                                    case 'next_turn':
                                        gameData.indexNextToPlay = (gameData.indexNextToPlay + 1)%gameData.players.length;
                                        gameData.nextToPlay = gameData.players[gameData.indexNextToPlay];
                                        gameData.turn ++;
                                        gameData.eventIndex = -1; //to be put to 0 by common increase
                                        socket.emit('next_turn', {playerUp: gameData.nextToPlay, game_mode: false, lastPlay: elt.data.lastPlay});
                                        socket.broadcast.emit('next_turn', {playerUp: gameData.nextToPlay, game_mode: false, lastPlay: elt.data.lastPlay});
                                        break;
                                    case 'redraw':
                                        socket.emit('redraw', {pseudo: elt.data.pseudo, hand: elt.data.hand});
                                        socket.broadcast.emit('redraw', {pseudo: elt.data.pseudo, hand: elt.data.hand});
                                        gameData.hands[elt.data.pseudo] = elt.data.hand;
                                        break;
                                    case 'played':
                                        socket.emit('played', elt.data);
                                        socket.broadcast.emit('played', elt.data);
                                        gameData.found[elt.data] ++;
                                        gameData.score ++;
                                        gameData.remainingCards --;
                                        break;
                                    case 'discarded':
                                        socket.emit('discarded', elt.data);
                                        socket.broadcast.emit('discarded', elt.data);
                                        gameData.discarded.push({number: elt.data.number, color: elt.data.number});
                                        gameData.remainingCards --;
                                        break;
                                    case 'warning':
                                        socket.emit('warning', {card: elt.card, pseudo: elt.pseudo});
                                        socket.broadcast.emit('warning', {card: elt.card, pseudo: elt.pseudo});
                                        break;
                                    case 'game_end':
                                        socket.emit('game_end', elt.data);
                                        socket.broadcast.emit('game_end', elt.data);
                                    default:
                                        break;
                                }
                                gameData.eventIndex ++;
                            }
                        }

                        var previousEvent = function () {
                            if (gameData.turn == 1 && gameData.eventIndex == 0) {
                                socket.emit('notify', 'You already reached max. turn');
                            } else {
                                var elt = turns[gameData.turn][gameData.eventIndex];
                                switch (elt.event) {
                                    case 'info':
                                        var aux;
                                        if (elt.data == 'add') {
                                            aux = 'remove';
                                            gameData.informations --;
                                        } else {
                                            aux = 'add';
                                            gameData.informations ++;
                                        }
                                        socket.emit('info', aux);
                                        socket.broadcast.emit('info', aux);
                                        break;
                                    case 'next_turn':
                                        gameData.indexNextToPlay = (gameData.indexNextToPlay - 1)%gameData.players.length;
                                        gameData.nextToPlay = gameData.players[gameData.indexNextToPlay];
                                        gameData.turn --;
                                        gameData.eventIndex = turns[gameData.turn].length; //to be put to l-1 by common decrease
                                        var lastPlay = "";
                                        if (gameData.turn != 1) {
                                            lastPlay = turns[gameData.turn-1][turns[gameData.turn-1].length-1].lastPlay;
                                        }
                                        socket.emit('next_turn', {playerUp: gameData.nextToPlay, game_mode: false, lastPlay: lastPlay});
                                        socket.broadcast.emit('next_turn', {playerUp: gameData.nextToPlay, game_mode: false, lastPlay: lastPlay});
                                        break;
                                    case 'redraw':
                                        var e = gameData.eventIndex;
                                        var t = gameData.turn;
                                        var not_found = true;
                                        while (t > -1 && not_found) {
                                            while (e > -1 && not_found) {
                                                if (turns[t][e].event == 'redraw' && turns[t][e].data.pseudo == elt.data.pseudo) {
                                                    not_found = false;
                                                    socket.emit('redraw', {pseudo: turns[t][e].data.pseudo, hand: turns[t][e].data.hand});
                                                    socket.broadcast.emit('redraw', {pseudo: turns[t][e].data.pseudo, hand: turns[t][e].data.hand});
                                                    gameData.hands[elt.data.pseudo] = turns[t][e].data.hand;
                                                }
                                                e --;
                                            }
                                            e = turn[t-1].length - 1;
                                            t --;
                                        }
                                        break;
                                    case 'played':
                                        socket.emit('unplayed', elt.data);
                                        socket.broadcast.emit('unplayed', elt.data);
                                        gameData.found[elt.data] --;
                                        gameData.score --;
                                        gameData.remainingCards ++;
                                        break;
                                    case 'discarded':
                                        socket.emit('undiscarded', elt.data);
                                        socket.broadcast.emit('undiscarded', elt.data);
                                        gameData.discarded.pop();
                                        gameData.remainingCards ++;
                                        break;
                                    case 'warning':
                                        socket.emit('unwarning');
                                        socket.broadcast.emit('unwarning');
                                        break;
                                    default:
                                        break;
                                }
                                gameData.eventIndex --;
                            }
                        }

                        socket.on('nextEvent', function() {
                            nextEvent();
                        });

                        socket.on('previousEvent', function() {
                            previousEvent();
                        });

                        socket.on('nextTurn', function() {
                            if (gameData.turn == 1 && gameData.eventIndex == 0) {
                                socket.emit('notify', 'You already reached max. turn');
                            } else {
                                var aux = gameData.turn;
                                while (gameData.turn == aux) {
                                    nextEvent();
                                }
                            }
                        });

                        socket.on('previousTurn', function() {
                            if (gameData.turn == 1 && gameData.eventIndex == 0) {
                                socket.emit('notify', 'You already reached max. turn');
                            } else {
                                var aux = gameData.turn;
                                while (gameData.turn == aux) {
                                    previousEvent();
                                }
                            }
                        });

                    } else {
                        console.log("Password Rejected");
                        socket.emit('reject_pwd');
                    }
                })

            } else {
                console.log('Pseudo rejected');
                socket.emit('reject_login');
            }
        });

    });

}); // endOf file reader

server.listen(port);
