var express = require('express');

var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent');

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
    if (info.length == 1) {
        info = Number(info);
    }
    hand.forEach(function(elt) {
        if (elt.number == info || elt.color == info) {
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
        }
    });
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

var players = process.argv.splice(2);

// Wrong number of players
if (players.length < 2 || players.length > 5) {
    throw "You must choose between 2 and 5 players"
}

var indexNextToPlay = Math.trunc(Math.random()*players.length);

var cardsPerPlayer = [null,null,5,5,4,4][players.length];

var gameData = {
    hands: {},
    deck: dealer(),
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
    remainingCards: 55,
    discarded: [],
    discardedToDsiplay: [],
    nextToPlay: players[indexNextToPlay],
    cardsPerPlayer: cardsPerPlayer,
    lastPlay: "",
};

players.forEach(function(name) {
    gameData.hands[name] = [];
    for (var i = 0; i < cardsPerPlayer; i++) {
        gameData.hands[name].push(gameData.deck.pop());
    };
});

gameData.remainingCards = gameData.deck.length;

console.log(gameData.hands);
console.log(gameData);

/* On utilise les sessions */
app.use(express.static('views'))

/* On affiche la page de tosolist par défaut */
.get('/game', function(req, res) {
    res.render('game_screen.ejs', {cardsPerPlayer: cardsPerPlayer});
})

/* On redirige vers la todolist si la page demandée n'est pas trouvée */
.use(function(req, res, next){
    res.redirect('/game');
});


io.sockets.on('connection', function (socket) {

    console.log("connection");

    socket.on('nouveau_client', function (pseudo) {
        pseudo = ent.encode(pseudo);
        if (players.includes(pseudo)) {

            socket.emit('pseudo_ok');
            socket.pseudo = pseudo;

            socket.on('login', function(pwd) {
                pwd = ent.encode(pwd);
                if (pwd == "test") {

                    //!!!!!!!!!!!!!!!!!!!
                    //Etering The main
                    var to_send = JSON.parse(JSON.stringify(gameData));
                    to_send.your_cards_angles = [];
                    to_send.hands[pseudo].forEach(function(elt) {
                        to_send.your_cards_angles.push(-elt.angle);
                    });
                    delete to_send.hands[pseudo];
                    delete to_send.deck;
                    socket.emit('init', to_send);
                    console.log(pseudo,"logged in.");

                    socket.on('playRequest', function(card_index) {
                        // update gameData
                        var card = gameData.hands[socket.pseudo].splice(card_index,1)[0];
                        var drawnCard = gameData.deck.pop();
                        gameData.remainingCards --;
                        gameData.hands[socket.pseudo].push(drawnCard);
                        console.log(socket.pseudo, "plays",card);
                        // Correct case
                        if (card.number == (gameData.found[card.color]+1)) {
                            console.log("Correct");
                            gameData.lastPlay = socket.pseudo + " plays " + card.color + " " + card.number;
                            console.log(gameData.lastPlay);
                            socket.emit('last_play', gameData.lastPlay);
                            socket.broadcast.emit('last_play', gameData.lastPlay);
                            gameData.found[card.color] ++;
                            socket.emit('played', card.color);
                            socket.broadcast.emit('played', card.color);
                            if (card.number == 5 && gameData.informations != 8) {
                                gameData.informations ++;
                                socket.emit('info', 'add');
                                socket.broadcast.emit('info', 'add');
                            }
                            if (gameData.black + gameData.green + gameData.red + gameData.yellow + gameData.blue + gameData.multicolor == 30) {
                                socket.emit('game_end', "Game finished: Congratulations, you scored 30 !!");
                                socket.broadcast.emit('game_end', "Game finished: Congratulations, you scored 30 !!");
                            }
                        // Incorrect case
                        } else {
                            console.log("Incorrect,", gameData.warnings+1, "warnings");
                            gameData.lastPlay = socket.pseudo + " atemps to play " + card.color + " " + card.number;
                            console.log(gameData.lastPlay);
                            socket.emit('last_play', gameData.lastPlay);
                            socket.broadcast.emit('last_play', gameData.lastPlay);
                            gameData.discarded.push(card);
                            socket.emit('discard', card);
                            socket.broadcast.emit('discard', card);
                            gameData.warnings ++;
                            socket.emit('warning', {card: card, pseudo: socket.pseudo});
                            socket.broadcast.emit('warning', {card: card, pseudo: socket.pseudo});
                            if (gameData.warnings == 3) {
                                socket.emit('game_end', "Game finished: You accumulated 3 warnings, you scored 0");
                                socket.broadcast.emit('game_end', "Game finished: You accumulated 3 warnings, you scored 0");
                            }
                        }
                        // Send drawn card
                        var to_send = [];
                        gameData.hands[pseudo].forEach(function(elt) {
                            to_send.push(-elt.angle);
                        });
                        socket.emit('redraw_mine', to_send);
                        socket.broadcast.emit('redraw', {pseudo: socket.pseudo, hand: gameData.hands[socket.pseudo]});
                    });

                    socket.on('discardRequest', function(card_index) {
                        var card = gameData.hands[socket.pseudo].splice(card_index,1)[0];
                        var drawnCard = gameData.deck.pop();
                        gameData.remainingCards --;
                        gameData.hands[socket.pseudo].push(drawnCard);
                        gameData.lastPlay = socket.pseudo + " discards " + card.color + " " + card.number;
                        console.log(gameData.lastPlay);
                        socket.emit('last_play', gameData.lastPlay);
                        socket.broadcast.emit('last_play', gameData.lastPlay);
                        gameData.discarded.push(card);
                        socket.emit('discard', card);
                        socket.broadcast.emit('discard', card);
                        var to_send = [];
                        gameData.hands[pseudo].forEach(function(elt) {
                            to_send.push(-elt.angle);
                        });
                        socket.emit('redraw_mine', to_send);
                        socket.broadcast.emit('redraw', {pseudo: socket.pseudo, hand: gameData.hands[socket.pseudo]});
                        if (gameData.informations != 8) {
                            gameData.informations ++;
                            socket.emit('info', 'add');
                            socket.broadcast.emit('info', 'add');
                        }
                    });

                    socket.on('infoRequest', function(data) {
                        if (gameData.informations != 0) {
                            if (is_info_correct(data.info, gameData.hands[data.player])) {
                                var sentence = eval_info(data.info, gameData.hands[data.player]);
                                gameData.lastPlay = socket.pseudo + " says " + data.player + ": " + sentence;
                                console.log(gameData.lastPlay);
                                socket.emit('last_play', gameData.lastPlay);
                                socket.broadcast.emit('last_play', gameData.lastPlay);
                                gameData.informations --;
                                socket.emit('info', 'remove');
                                socket.broadcast.emit('info', 'remove');
                            } else {
                                socket.emit('notify', data.player + " has no " + data.info + " in his hand !");
                            }
                        } else {
                            socket.emit('notify', 'No information available!');
                        }
                    });

                    socket.on('rotateRequest', function(data) {
                        console.log(socket.pseudo,"wants to rotate his card nb",data.id,"by an angle of",data.angle,"degrees");
                        gameData.hands[socket.pseudo][data.id].angle += data.angle;
                        var to_send = [];
                        gameData.hands[pseudo].forEach(function(elt) {
                            to_send.push(-elt.angle);
                        });
                        socket.emit('redraw_mine', to_send);
                        socket.broadcast.emit('redraw', {pseudo: socket.pseudo, hand: gameData.hands[socket.pseudo]});
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
                            var to_send = [];
                            gameData.hands[pseudo].forEach(function(elt) {
                                to_send.push(-elt.angle);
                            });
                            socket.emit('redraw_mine', to_send);
                            socket.emit('notify', 'Reordered, changes applied.');
                            socket.broadcast.emit('redraw', {pseudo: socket.pseudo, hand: gameData.hands[socket.pseudo]});
                        } else {
                            socket.emit('notify', 'Invalid order given, no change applied.');
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

console.log("Listening to port 3333 ");
server.listen(3333);
