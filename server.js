var server = require('http').createServer();
var io = require('socket.io')(server);

io.on('connection', function(client){
  //console.log("Connection. ",client);
  client.on('ID', function(data){
    console.log("Event! ", data);
  });
  client.on('disconnect', function(){
    console.log("Disconnected.")
  });
});

var port = 3000;
server.listen(port);
console.log("Listening to port " + port);
