var express = require('express');

var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent');

var dealer = function () {
    cards = [];
    ['black', 'red', 'blue', 'yellow', 'green'].forEach(function(color){
        [1,1,1,2,2,3,3,4,4,5].forEach(function(number){
            cards.push({number: number, color: color});
        });
    });
    for (var i = 1; i < 6; i++) {
        cards.push({number: i, color: 'multicolor'});
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

var players = ['Kant', 'Zensio', 'Louis', 'Antonin'];
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

//test to try discarded display
for (var i = 0; i < 10; i++) {
    gameData.discarded.push(gameData.deck.pop());
}

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


io.sockets.on('connection', function (socket, pseudo) {

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
                        }
                        // Send drawn card
                        socket.broadcast.emit('card_drawn', {pseudo: socket.pseudo, drawnCard: drawnCard, lastCardIndex: card_index});
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
                        socket.broadcast.emit('card_drawn', {pseudo: socket.pseudo, drawnCard: drawnCard, lastCardIndex: card_index});
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
                                socket.emit('wrong_info', data.player + " has no " + data.info + " in his hand !");
                            }
                        } else {
                            socket.emit('no_info');
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
