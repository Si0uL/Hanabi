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

var players = ['Kant', 'Zensio', 'Louis', 'Antonin'];

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
};

players.forEach(function(name) {
    gameData.hands[name] = [];
    for (var i = 0; i < cardsPerPlayer; i++) {
        gameData.hands[name].push(gameData.deck.pop());
    };
});
gameData.remainingCards = gameData.deck.length;

//test to try discarded display
for (var i = 0; i < 10; i++) {
    gameData.discarded.push(gameData.deck.pop());
}

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

            socket.on('login', function(pwd) {
                pwd = ent.encode(pwd);
                if (pwd == "test") {
                    socket.pseudo = pseudo;
                    var to_send = JSON.parse(JSON.stringify(gameData));
                    delete to_send.hands[pseudo];
                    delete to_send.deck;
                    socket.emit('init', to_send);
                    console.log(pseudo,"logged in.");
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
