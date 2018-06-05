var express = require('express');

var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    fs = require('fs'),
    ent = require('ent');

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// Beginning of main

// Arguments reading
var port = Number(process.argv[2]);

// Parse passwords.json
var passwords;
var data = fs.readFileSync('./data/passwords.json', 'utf8');
passwords = JSON.parse(data);

// Get Players list
var players = [];
for (var key in passwords) {
    players.push(key);
};

// Check all players' password
var aux = "";
players.forEach(function(elt) {
    if (!(elt in passwords)) throw "No registered password for " + elt;
    aux += elt + " ";
});

// Define players status
var inGame = {};
players.forEach(function(elt) {
    inGame[elt] = false;
});

// Containing all in progress games
var gamesCache = [];

// Functions definitions
var getAvailables = function(myName) {
    var to_return = [];
    for (var key in inGame) {
        if (key != myName && !inGame[key]) {
            to_return.push(key);
        };
    };
    return to_return;
};

var changeStatus = function(playersArr, goingInGame) {
    playersArr.forEach(function(elt) {
        inGame[elt] = goingInGame;
    });
}

var dealer = function (easyMode) {
    cards = [];
    ['black', 'red', 'blue', 'yellow', 'green'].forEach(function(color){
        [1,1,1,2,2,3,3,4,4,5].forEach(function(number){
            cards.push({number: number, color: color, angle: 0});
        });
    });
    if (!easyMode) {
        for (var i = 1; i < 6; i++) {
            cards.push({number: i, color: 'multicolor', angle: 0});
        };
    };
    var cards_dealt = [];
    var cards_number = cards.length;
    for (var i = 0; i < cards_number; i++) {
        cards_dealt.push(cards.splice(Math.trunc(Math.random()*(cards_number-i)), 1)[0]);
    }
    return cards_dealt;
}

//nb is the players number
var isCool = function (deck, nb) {
    if (deck[0].color === 'multicolor' && deck[0].number != 5) return false;
    if (deck[1].color === 'multicolor' && deck[1].number < 5 - nb) return false;
    if (deck[2].color === 'multicolor' && deck[2].number < 5 - nb - 1) return false;
    if (nb === 2) {
        //Avant dernière carte -> identique à dernière, seul cas: carte 2 à 2 joueurs
        if (deck[1].color === deck[0].color && deck[1].number === 2 && deck[0].number === 2) return false;
        //Second cas: trois cartes 1 à 2 joueurs
        if (deck[2].color === deck[1].color && deck[1].color === deck[0].color && deck[2].number === 1 && deck[1].number === 1 && deck[0].number === 1) return false;
    };
    return true;
}

var hash = function (arr, nb) {
    var to_return = nb.toString();
    var color_nb = {
        'black': 0,
        'red': 1,
        'blue': 2,
        'yellow': 3,
        'green': 4,
        'multicolor': 5
    };
    arr.forEach(function(elt) {
        to_return += String.fromCharCode(40 + color_nb[elt.color]*5 + elt.number - 1);
    });
    return to_return;
};

var unHash = function (str, nb) {
    if (nb != Number(str[0])) throw "Wrong Number of Players";
    str = str.substr(1);
    if (str.length != 55) throw "Wrong Hash Length";
    var to_return = [];
    var nbToColor = ['black', 'red', 'blue', 'yellow', 'green', 'multicolor'];
    for (var i = 0; i < str.length; i++) {
        var _c = nbToColor[Math.floor((str[i].charCodeAt(0) - 40)/5)];
        var _n = str[i].charCodeAt(0) % 5 + 1;
        to_return.push({color: _c, number: _n, angle: 0});
    }
    return to_return;
};

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

var expectedScore = function(found, deckAndHands, alreadyDiscarded, playersNumber, cardsPerPlayer, easyMode) {
    var totalCards = 55;
    if (easyMode) totalCards = 50;
    var isInDeck = function(color, number) {
        var _bool = false;
        deckAndHands.forEach(function(elt) {
            if (elt && elt.color === color && elt.number === number) {
                _bool = true;
            };
        });
        return _bool;
    };
    var maxScore = 0;
    for (var c in found) {
        maxScore += found[c];
        var _num = found[c] + 1;
        while (isInDeck(c, _num)) {
            maxScore ++;
            _num ++;
        };
    };
    var maxDiscard = totalCards - playersNumber*(cardsPerPlayer - 1) - maxScore - alreadyDiscarded;
    if (maxDiscard < 0) {
        maxScore += maxDiscard;
        maxDiscard = 0;
    };
    return [maxScore, maxDiscard];
};

var launch_game = function(socket, useCache, players, hardMode, easyMode, hashCode) {

    var gameData;
    var cacheIndex;

    // Game being initialized, must init all variables
    if (!useCache) {
        //Shuffle Players Array
        var _aux = [];
        for (var i = players.length; i > 0; i--) {
            _aux.push(players.splice(Math.floor(Math.random()*i), 1)[0]);
        };
        players = _aux;

        //Deal or Reconstitute Deck
        var deck;
        if (hashCode) {
            try {
                deck = unHash(hashCode, players.length);
            } catch (err) {
                console.log(err);
                socket.emit('hash_error', err);
                return
            };
        } else {
            deck = dealer(easyMode);
            while (!isCool(deck)) {
                deck = dealer(easyMode);
            };
        };

        // Init of game variables
        gameData = {
            replayMode: false,
            players: players,
            hands: {},
            deck: deck,
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
            turn: 1,
            remainingCards: 55,
            remainingTurns: -1,
            discarded: [],
            nextToPlay: players[0],
            indexNextToPlay: 0,
            cardsPerPlayer: [null,null,5,5,4,4][players.length],
            lastPlay: "",
            hardMode: hardMode,
            easyMode: easyMode,
            maxScore: undefined,
            maxDiscard: undefined,
            deckHash: hash(deck, players.length),
            messages: [],
        };

        // Cards deal
        players.forEach(function(name) {
            gameData.hands[name] = [];
            for (var i = 0; i < gameData.cardsPerPlayer; i++) {
                gameData.hands[name].push(gameData.deck.pop());
            };
        });

        gameData.remainingCards = gameData.deck.length;

        var updateExpected = function() {
            var deckAndHands = gameData.deck;
            for (var _p in gameData.hands) {
                deckAndHands = deckAndHands.concat(gameData.hands[_p]);
            };
            var _expected = expectedScore(gameData.found, deckAndHands, gameData.discarded.length, gameData.players.length, gameData.cardsPerPlayer, gameData.easyMode);
            gameData.maxScore = _expected[0];
            gameData.maxDiscard = _expected[1];
        };

        updateExpected();

        // Json to be saved at the end:
        var _d = new Date();
        var jsonName = "games/" + _d.getUTCFullYear() + (_d.getUTCMonth() + 1) + _d.getUTCDate() + _d.getUTCHours() + _d.getUTCMinutes();
        players.forEach(function (p) {
            jsonName += "_" + p;
        });
        jsonName += ".json";
        gameData.jsonName = jsonName;

        // Save in cache
        cacheIndex = gamesCache.length;
        gamesCache.push(gameData);

        // launch invitations
        var invited = JSON.parse(JSON.stringify(gameData.players));
        invited.splice(invited.indexOf(socket.pseudo), 1);
        socket.broadcast.emit('invitation', invited);

        console.log('Game started with ' + players);

    // Game already in progress, must load the game from cache
    } else {
        gamesCache.forEach(function(elt, n) {
            if (elt.players.includes(socket.pseudo)){
                gameData = elt;
                cacheIndex = n;
            };
        });
    };

    // Players are now busy
    changeStatus(gameData.players, true);

    // Future recorded JSON
    var recorded = {
        gameDataInit: JSON.parse(JSON.stringify(gameData)),
        turns: [[], []],
    }
    recorded.gameDataInit.replayMode = true;

    // Data to be sent
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

    // Beginning of transmission
    socket.emit('init', to_send);

    var next_turn = function() {
        gameData.indexNextToPlay = (gameData.indexNextToPlay + 1)%gameData.players.length;
        gameData.nextToPlay = gameData.players[gameData.indexNextToPlay];
        socket.emit('next_turn', {playerUp: gameData.nextToPlay, game_mode: game_mode, lastPlay: gameData.lastPlay});
        socket.broadcast.emit('next_turn', {playerUp: gameData.nextToPlay, game_mode: game_mode, lastPlay: gameData.lastPlay});
        recorded.turns[gameData.turn].push({event: 'next_turn', data: {playerUp: gameData.nextToPlay, lastPlay: gameData.lastPlay}});
        if (gameData.remainingTurns > 0) {
            gameData.remainingTurns --;
            gameData.turn ++;
            recorded.turns.push([]);
            fs.writeFileSync(gameData.jsonName, JSON.stringify(recorded));
        } else if (gameData.remainingTurns == 0) {
            socket.emit('game_end', "Game finished: You scored " + gameData.score);
            socket.broadcast.emit('game_end', "Game finished: You scored " + gameData.score);
            recorded.turns[gameData.turn].push({event: 'game_finished', data: "Game finished: You scored " + gameData.score});
            fs.writeFileSync(gameData.jsonName, JSON.stringify(recorded));
        } else {
            gameData.turn ++;
            recorded.turns.push([]);
            fs.writeFileSync(gameData.jsonName, JSON.stringify(recorded));
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
            // Correct case
            if (card.number == (gameData.found[card.color]+1)) {
                gameData.score ++;
                gameData.lastPlay = socket.pseudo + " plays " + card.color + " " + card.number;
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
                }
            // Incorrect case
            } else {
                gameData.lastPlay = socket.pseudo + " atemps to play " + card.color + " " + card.number;
                gameData.discarded.push(card);
                updateExpected();
                socket.emit('discarded', card, gameData.maxScore, gameData.maxDiscard);
                socket.broadcast.emit('discarded', card, gameData.maxScore, gameData.maxDiscard);
                recorded.turns[gameData.turn].push({event: 'discarded', data: card});
                gameData.warnings ++;
                socket.emit('warning', {card: card, pseudo: socket.pseudo});
                socket.broadcast.emit('warning', {card: card, pseudo: socket.pseudo});
                recorded.turns[gameData.turn].push({event: 'warning', data: {card: card, pseudo: socket.pseudo}});
                if (gameData.warnings == 3) {
                    socket.emit('game_end', "Game finished: You accumulated 3 warnings, you scored 0");
                    socket.broadcast.emit('game_end', "Game finished: You accumulated 3 warnings, you scored 0");
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
            gameData.discarded.push(card);
            updateExpected();
            socket.emit('discarded', card, gameData.maxScore, gameData.maxDiscard);
            socket.broadcast.emit('discarded', card, gameData.maxScore, gameData.maxDiscard);
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
        gameData.messages = [{pseudo: socket.pseudo, message: message}].concat(gameData.messages);
    });

    socket.on('message_history_request', function() {
        socket.emit('message_history', gameData.messages);
    });

};

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// Express Routes
app.use(express.static('views'));

server.listen(port);

io.sockets.on('connection', function (socket) {

    socket.once('login', function (pseudo, pwd) {
        if (pseudo != null) pseudo = ent.encode(pseudo);
        if (pwd != null) pwd = ent.encode(pwd);
        if (!players.includes(pseudo) || pwd != passwords[pseudo]) {
            console.log('Connection Refused');
            socket.emit('reject_login');
        } else {
            console.log(pseudo + " connected");
            socket.emit('connected', inGame[pseudo], getAvailables(pseudo));
            socket.pseudo = pseudo;

            // lauch immediatly using cached gameData
            if (inGame[pseudo]) {launch_game(socket, true)};

            socket.on('launch_game', function(cached, players, mode, hashCode) {
                if (cached) {
                    launch_game(socket, true);
                } else {
                    var hardMode = mode === 'hard';
                    var easyMode = mode === 'easy';
                    launch_game(socket, false, players, hardMode, easyMode, hashCode);
                };
            });

        };
    });

});
