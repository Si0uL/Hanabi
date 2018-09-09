angular
    .module( 'hanabi.services' )
    .factory( 'userService', [ '$q', userService ] );

function userService($q) {

    var userSocket = undefined;
    var user = undefined;
    var game = undefined;

    return {
        getSocket: function() {
            return userSocket;
        },
        getUser: function() {
            return user;
        },
        getGame: function() {
            return game;
        },
        setGame: function(newGame) {
            game = newGame;
        },
        connectionAttempt: function(loginData) {
            var deferred = $q.defer();
            var socket = io.connect(location.host);
            var logginError = 'OK';

            socket.emit('nouveau_client', loginData.username);

            setTimeout(function(){ deferred.reject('Timeout on Request: Check server IP'); }, 10000);

            socket.on('reject_login', function() {
                deferred.reject('Wrong username');
            });

            socket.on('pseudo_ok', function() {
                socket.emit('login', loginData.password);

                socket.on('reject_pwd', function() {
                    deferred.reject('Wrong Password');
                });

                socket.on('init', function(gameData) {
                    for (var p in gameData.hands) {
                        gameData.hands[p].reverse();
                    };
                    gameData.colleagues = [];
                    gameData.players.forEach(function(elt,n) {
                        if (elt === loginData.username) {
                            for (var i = 0; i < gameData.players.length - 1; i++) {
                                gameData.colleagues[i] = gameData.players[(n + i + 1) % gameData.players.length];
                            };
                        };
                    });
                    for (var i = 0; i < gameData.your_cards_angles.length; i++) {
                        gameData.your_cards_angles[i] = {angle: gameData.your_cards_angles[i], index: i, noCard: gameData.your_cards_angles[i] === -1};
                    };

                    game = gameData;
                    userSocket = socket;
                    user = loginData.username;

                    deferred.resolve('ok')
                });
            });

            return deferred.promise;
        }
    };

}
