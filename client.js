var app = require('express')(),
    server = require('http').createServer(app),
    listener = require('socket.io').listen(server),
    io_client = require('socket.io-client');


var client_socket = io_client.connect('http://localhost:3000');

client_socket.emit('ID', {id: "Kant", pass: "bite"});
