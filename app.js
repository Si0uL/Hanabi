var express = require('express');

var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent');

var dealer = function () {
    cards = [];
    ['white', 'red', 'blue', 'yellow', 'green'].forEach(function(color){
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

var deck = dealer();
var players = ['Kant', 'Zensio', 'Louis', 'Antonin'];

var cardsPerPlayer = [null,null,5,5,4,4][players.length];

var data = {
    hands: {}
};

players.forEach(function(name) {
    data.hands[name] = [];
    for (var i = 0; i < cardsPerPlayer; i++) {
        data.hands[name].push(deck.pop());
    };
});

console.log(data.hands);

/* On utilise les sessions */
app.use(express.static('views'))

/* On affiche la page de tosolist par défaut */
.get('/game', function(req, res) {
    res.render('game_screen.ejs');
})

/* On redirige vers la todolist si la page demandée n'est pas trouvée */
.use(function(req, res, next){
    res.redirect('/game');
});


io.sockets.on('connection', function (socket, pseudo) {

    console.log("connection");

    socket.on('nouveau_client', function (pseudo) {
        pseudo = ent.encode(pseudo);
        socket.pseudo = pseudo;
        socket.emit('init', data)
        console.log(pseudo,"logged in.");
    });

});

console.log("Listening to port 3333 ");
server.listen(3333);
