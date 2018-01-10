var express = require('express');

var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    fs = require('fs'),
    ent = require('ent');

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// Beginning of main

// Arguments reading
if (!["test", "game", "game-hard"].includes(process.argv[2])) throw "Invalid second argument, use 'test', 'game' or 'game-hard'";
var game_mode = (process.argv[2].includes("game"));
var hardMode = (process.argv[2] == "game-hard");

var port = Number(process.argv[3]);

// Functions definitions
var dealer = function () {
    cards = [];
    ['black', 'red', 'blue', 'yellow', 'green'].forEach(function(color){
        [1,1,1,2,2,3,3,4,4,5].forEach(function(number){
            cards.push({number: number, color: color, angle: 0});
        });
    });
    for (var i = 1; i < 6; i++) {
        cards.push({number: i, color: 'multicolor', angle: 0});
    };
    var cards_dealt = [];
    for (var i = 0; i < 55; i++) {
        cards_dealt.push(cards.splice(Math.trunc(Math.random()*(55-i)), 1)[0]);
    }
    return cards_dealt;
}

var is_info_correct = function (info, hand) {
    var to_return = false;
    var is_color = true;
    if (info.length == 1) {
        info = Number(info);
        is_color = false;
    };
    hand.forEach(function(elt) {
        if (elt.number == info || elt.color == info) {
            to_return = true
        } else if (hardMode && is_color && elt.color == 'multicolor') { // if hardmode + color-type info + multicolor card
            to_return = true
        }
    });
    return to_return;
}

var eval_info = function (info, hand) {
    var number = false;
    if (info.length == 1) {
        info = Number(info);
        number = true;
    }
    var pos = [];
    hand.forEach(function(elt, n) {
        if (elt.number == info || elt.color == info) {
            pos.push(n+1);
        } else if (hardMode && !number && elt.color == 'multicolor') {
            pos.push(n+1);
        }
    });
    // sentence construction
    var sentence = "You have " + pos.length;
    if (number) {
        sentence += " number " + info;
    } else {
        sentence += " " + info;
    }
    if (pos.length > 1) {
        sentence += " cards in position ";
        for (var i = 0; i < pos.length-1; i++) {
            sentence += pos[i] + ", ";
        }
        sentence += "and " + pos[pos.length-1] + ".";
    } else {
        sentence += " card in position " + pos[0] + ".";
    }
    return sentence;
}

var reorder_correct = function(str) {
    aux = ['1','2','3','4'];
    if (str.length == 5) {
        aux.push('5');
    }
    x = [];
    to_return = true;
    for (var i = 0; i < str.length; i++) {
        if (x.includes(str[i]) || !aux.includes(str[i])) {
            to_return = false
        }
        x.push(str[i])
    }
    return to_return;
}

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

// Parse passwords.JSON
var passwords;

fs.readFile('./data/passwords.json', 'utf8', function(err, data) {

    if (err) throw "Impossible to find your password JSON file!";
    passwords = JSON.parse(data);

    var players = process.argv.splice(4);
    var aux = "";
    // Wrong number of players
    if (players.length < 2 || players.length > 5) throw "You must choose between 2 and 5 players";
    players.forEach(function(elt) {
        if (!(elt in passwords)) throw "No registered password for " + elt;
        aux += elt + " ";
    });

    console.log("GAME START: " + new Date());
    console.log("Players: " + aux + "\n");

    // Init of game variables
    var indexNextToPlay = Math.trunc(Math.random()*players.length);
    var cardsPerPlayer = [null,null,5,5,4,4][players.length];
    var gameData = {
        replayMode: false,
        players: players,
        hands: {},
        deck: dealer(),
        score: 0,
        found: {
            'black': 0,
            'red': 0,
            'yellow': 0,
            'green': 0,
            'blue': 0,
            'multicolor': 0,
        },
        informations: 8,
        warnings: 0,
        turn: 0,
        remainingCards: 55,
        remainingTurns: -1,
        discarded: [],
        discardedToDsiplay: [],
        nextToPlay: players[indexNextToPlay],
        indexNextToPlay: indexNextToPlay,
        cardsPerPlayer: cardsPerPlayer,
        lastPlay: "",
        hardMode: hardMode,
    };
    var messages = [];

    // Cards deal
    players.forEach(function(name) {
        gameData.hands[name] = [];
        for (var i = 0; i < cardsPerPlayer; i++) {
            gameData.hands[name].push(gameData.deck.pop());
        };
    });

    gameData.remainingCards = gameData.deck.length;

    console.log(gameData.hands);
    console.log(gameData);

    gameData.turn ++;
    console.log("\nTURN " + gameData.turn + ": " + new Date());
    console.log(gameData.nextToPlay + " is playing:");

    // Json to be saved at the end:
    var _d = new Date();
    var jsonName = "games/" + _d.getUTCFullYear() + (_d.getUTCMonth() + 1) + _d.getUTCDate() + _d.getUTCHours() + _d.getUTCMinutes();
    players.forEach(function (p) {
        jsonName += "_" + p;
    });
    jsonName += ".json";
    var recorded = {
        gameDataInit: JSON.parse(JSON.stringify(gameData)),
        turns: [[], []],
    }
    recorded.gameDataInit.replayMode = true;

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // Express Routes
    app.use(express.static('views'));

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // EventListeners
    io.sockets.on('connection', function (socket) {

        console.log("connection");

        socket.on('nouveau_client', function (pseudo) {
            if (pseudo != null) pseudo = ent.encode(pseudo);
            if (players.includes(pseudo)) {

                socket.emit('pseudo_ok');
                socket.pseudo = pseudo;

                socket.on('login', function(pwd) {
                    if (pwd != null) pwd = ent.encode(pwd);
                    if (pwd == passwords[socket.pseudo]) {

                        //!!!!!!!!!!!!!!!!!!!
                        //Etering The main
                        var to_send = JSON.parse(JSON.stringify(gameData));
                        to_send.your_cards_angles = [];
                        to_send.hands[socket.pseudo].forEach(function(elt) {
                            if (!elt) {
                                to_send.your_cards_angles.push(-1);
                            } else {
                                to_send.your_cards_angles.push(-elt.angle);
                            }
                        });
                        delete to_send.hands[socket.pseudo];
                        delete to_send.deck;
                        socket.emit('init', to_send);
                        socket.emit('next_turn', {playerUp: gameData.nextToPlay, game_mode: false, lastPlay: gameData.lastPlay});
                        socket.emit('redraw_mine', angles_array(gameData.hands[socket.pseudo]));
                        console.log(socket.pseudo,"logged in.");

                        var next_turn = function() {
                            gameData.indexNextToPlay = (gameData.indexNextToPlay + 1)%gameData.players.length;
                            gameData.nextToPlay = gameData.players[gameData.indexNextToPlay];
                            socket.emit('next_turn', {playerUp: gameData.nextToPlay, game_mode: game_mode, lastPlay: gameData.lastPlay});
                            socket.broadcast.emit('next_turn', {playerUp: gameData.nextToPlay, game_mode: game_mode, lastPlay: gameData.lastPlay});
                            recorded.turns[gameData.turn].push({event: 'next_turn', data: {playerUp: gameData.nextToPlay, lastPlay: gameData.lastPlay}});
                            if (gameData.remainingTurns > 0) {
                                gameData.remainingTurns --;
                                gameData.turn ++;
                                console.log("\nTURN " + gameData.turn + ": " + new Date());
                                console.log(gameData.nextToPlay + " is playing:");
                                recorded.turns.push([]);
                                fs.writeFileSync(jsonName, JSON.stringify(recorded));
                            } else if (gameData.remainingTurns == 0) {
                                socket.emit('game_end', "Game finished: You scored " + gameData.score);
                                socket.broadcast.emit('game_end', "Game finished: You scored " + gameData.score);
                                console.log("GAME FINISHED, SCORE: " + gameData.score);
                                recorded.turns[gameData.turn].push({event: 'game_finished', data: "Game finished: You scored " + gameData.score});
                                fs.writeFileSync(jsonName, JSON.stringify(recorded));
                            } else {
                                gameData.turn ++;
                                console.log("\nTURN " + gameData.turn + ": " + new Date());
                                console.log(gameData.nextToPlay + " is playing:");
                                recorded.turns.push([]);
                                fs.writeFileSync(jsonName, JSON.stringify(recorded));
                            }
                        }

                        socket.on('playRequest', function(card_index) {
                            if (socket.pseudo != gameData.nextToPlay) {
                                socket.emit('notify', 'It\'s not your turn');
                            } else {
                                // update gameData
                                var card = gameData.hands[socket.pseudo].splice(card_index,1)[0];
                                var drawnCard = gameData.deck.pop();
                                gameData.remainingCards --;
                                gameData.hands[socket.pseudo].push(drawnCard);
                                console.log(socket.pseudo, "plays",card);
                                // Correct case
                                if (card.number == (gameData.found[card.color]+1)) {
                                    gameData.score ++;
                                    console.log("Correct");
                                    gameData.lastPlay = socket.pseudo + " plays " + card.color + " " + card.number;
                                    console.log(gameData.lastPlay);
                                    gameData.found[card.color] ++;
                                    socket.emit('played', card.color);
                                    socket.broadcast.emit('played', card.color);
                                    recorded.turns[gameData.turn].push({event: 'played', data: card.color});
                                    if (card.number == 5 && gameData.informations != 8) {
                                        gameData.informations ++;
                                        socket.emit('info', 'add');
                                        socket.broadcast.emit('info', 'add');
                                        recorded.turns[gameData.turn].push({event: 'info', data: 'add'});
                                    }
                                    if (gameData.score == 30) {
                                        socket.emit('game_end', "Game finished: Congratulations, you scored 30 !!");
                                        socket.broadcast.emit('game_end', "Game finished: Congratulations, you scored 30 !!");
                                        recorded.turns[gameData.turn].push({event: 'game_end', data: "Game finished: Congratulations, you scored 30 !!"});
                                        console.log("GAME FINISHED, SCORE: 30");
                                    }
                                // Incorrect case
                                } else {
                                    console.log("Incorrect,", gameData.warnings+1, "warnings");
                                    gameData.lastPlay = socket.pseudo + " atemps to play " + card.color + " " + card.number;
                                    console.log(gameData.lastPlay);
                                    gameData.discarded.push(card);
                                    socket.emit('discarded', card);
                                    socket.broadcast.emit('discarded', card);
                                    recorded.turns[gameData.turn].push({event: 'discarded', data: card});
                                    gameData.warnings ++;
                                    socket.emit('warning', {card: card, pseudo: socket.pseudo});
                                    socket.broadcast.emit('warning', {card: card, pseudo: socket.pseudo});
                                    recorded.turns[gameData.turn].push({event: 'warning', data: {card: card, pseudo: socket.pseudo}});
                                    if (gameData.warnings == 3) {
                                        socket.emit('game_end', "Game finished: You accumulated 3 warnings, you scored 0");
                                        socket.broadcast.emit('game_end', "Game finished: You accumulated 3 warnings, you scored 0");
                                        console.log("GAME FINISHED, SCORE: 0");
                                        recorded.turns[gameData.turn].push({event: 'game_end', data: "GAME FINISHED, SCORE: 0"});
                                    }
                                }
                                // Send drawn card
                                socket.emit('redraw_mine', angles_array(gameData.hands[socket.pseudo]));
                                socket.broadcast.emit('redraw', {pseudo: socket.pseudo, hand: gameData.hands[socket.pseudo]});
                                recorded.turns[gameData.turn].push({event: 'redraw', data: {pseudo: socket.pseudo, hand: JSON.parse(JSON.stringify(gameData.hands[socket.pseudo]))}});
                                // if last card drawn
                                if (gameData.remainingCards == 0) {
                                    gameData.remainingTurns = gameData.players.length;
                                    socket.emit('notify', socket.pseudo + ' drew the last card, everybody has now one turn left.');
                                    socket.broadcast.emit('notify', socket.pseudo + ' drew the last card, everybody has now one turn left.');
                                }
                                next_turn();
                            }
                        });

                        socket.on('discardRequest', function(card_index) {
                            if (socket.pseudo != gameData.nextToPlay) {
                                socket.emit('notify', 'It\'s not your turn');
                            } else {
                                var card = gameData.hands[socket.pseudo].splice(card_index,1)[0];
                                var drawnCard = gameData.deck.pop();
                                gameData.remainingCards --;
                                gameData.hands[socket.pseudo].push(drawnCard);
                                gameData.lastPlay = socket.pseudo + " discards " + card.color + " " + card.number;
                                console.log(gameData.lastPlay);
                                gameData.discarded.push(card);
                                socket.emit('discarded', card);
                                socket.broadcast.emit('discarded', card);
                                recorded.turns[gameData.turn].push({event: 'discarded', data: card});
                                socket.emit('redraw_mine', angles_array(gameData.hands[socket.pseudo]));
                                socket.broadcast.emit('redraw', {pseudo: socket.pseudo, hand: gameData.hands[socket.pseudo]});
                                recorded.turns[gameData.turn].push({event: 'redraw', data: {pseudo: socket.pseudo, hand: JSON.parse(JSON.stringify(gameData.hands[socket.pseudo]))}});
                                if (gameData.informations != 8) {
                                    gameData.informations ++;
                                    socket.emit('info', 'add');
                                    socket.broadcast.emit('info', 'add');
                                    recorded.turns[gameData.turn].push({event: 'info', data: 'add'});
                                }
                                // if last card drawn
                                if (gameData.remainingCards == 0) {
                                    gameData.remainingTurns = gameData.players.length;
                                    socket.emit('notify', socket.pseudo + ' drew the last card, everybody has now one turn left.');
                                    socket.broadcast.emit('notify', socket.pseudo + ' drew the last card, everybody has now one turn left.');
                                }
                                next_turn()
                            }
                        });

                        socket.on('infoRequest', function(data) {
                            if (socket.pseudo != gameData.nextToPlay) {
                                socket.emit('notify', 'It\'s not your turn');
                            } else {
                                if (gameData.informations != 0) {
                                    if (is_info_correct(data.info, gameData.hands[data.player])) {
                                        var sentence = eval_info(data.info, gameData.hands[data.player]);
                                        gameData.lastPlay = socket.pseudo + " says " + data.player + ": " + sentence;
                                        console.log(gameData.lastPlay);
                                        gameData.informations --;
                                        socket.emit('info', 'remove');
                                        socket.broadcast.emit('info', 'remove');
                                        recorded.turns[gameData.turn].push({event: 'info', data: 'remove'});
                                        next_turn();
                                    } else {
                                        socket.emit('notify', data.player + " has no " + data.info + " in his hand !");
                                    }
                                } else {
                                    socket.emit('notify', 'No information available!');
                                }
                            }
                        });

                        socket.on('rotateRequest', function(data) {
                            console.log(socket.pseudo,"wants to rotate his card nb",data.id,"by an angle of",data.angle,"degrees");
                            gameData.hands[socket.pseudo][data.id].angle += data.angle;
                            socket.emit('redraw_mine', angles_array(gameData.hands[socket.pseudo]));
                            socket.broadcast.emit('redraw', {pseudo: socket.pseudo, hand: gameData.hands[socket.pseudo]});
                            recorded.turns[gameData.turn].push({event: 'redraw', data: {pseudo: socket.pseudo, hand: JSON.parse(JSON.stringify(gameData.hands[socket.pseudo]))}});
                        });

                        socket.on('reorderRequest', function(str) {
                            str = ent.encode(str);
                            if (str.length == gameData.cardsPerPlayer && reorder_correct(str)) {
                                var new_hand = [];
                                for (var i = 0; i < str.length; i++) {
                                    new_hand.push(gameData.hands[socket.pseudo][Number(str[i])-1]);
                                }
                                gameData.hands[socket.pseudo] = new_hand;
                                console.log(socket.pseudo,"reorders his hand. New hand:",new_hand);
                                socket.emit('redraw_mine', angles_array(gameData.hands[socket.pseudo]));
                                socket.emit('notify', 'Reordered, changes applied.');
                                socket.broadcast.emit('redraw', {pseudo: socket.pseudo, hand: gameData.hands[socket.pseudo]});
                                recorded.turns[gameData.turn].push({event: 'redraw', data: {pseudo: socket.pseudo, hand: JSON.parse(JSON.stringify(gameData.hands[socket.pseudo]))}});
                            } else {
                                socket.emit('notify', 'Invalid order given, no change applied.');
                            }
                        });

                        socket.on('message', function(message) {
                            str = ent.encode(message);
                            socket.emit('message', {pseudo: socket.pseudo, message: message});
                            socket.broadcast.emit('message', {pseudo: socket.pseudo, message: message});
                            messages = [{pseudo: socket.pseudo, message: message}].concat(messages);
                        });

                        socket.on('message_history_request', function() {
                            socket.emit('message_history', messages);
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
