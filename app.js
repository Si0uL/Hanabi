var express = require('express');

var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent');

var data = {
    hands: {
        kant: [
            {number:5, color: 'blue'},
            {number:1, color: 'red'},
            {number:3, color: 'multicolor'},
            {number:2, color: 'blue'},
            {number:2, color: 'green'},
        ],
        zensio: [
            {number:4, color: 'white'},
            {number:4, color: 'green'},
            {number:1, color: 'blue'},
            {number:1, color: 'blue'},
            {number:4, color: 'yellow'},
        ],
    }
};

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
