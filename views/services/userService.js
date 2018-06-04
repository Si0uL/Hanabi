angular
    .module( 'hanabi.services' )
    .factory( 'userService', [ '$q', userService ] );

function userService($q) {

    var userSocket = undefined;
    var user = undefined;
    var game = undefined;
    var availablePlayers = undefined;

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
        getAvailablePlayers: function() {
            return availablePlayers;
        },
        connectionAttempt: function(loginData) {
            var deferred = $q.defer();
            var socket = io.connect('http://' + loginData.server);

            socket.emit('login', loginData.username, loginData.password);

            setTimeout(function(){ deferred.reject('Timeout on Request: Check server IP'); }, 10000);

            socket.once('reject_login', function() {
                deferred.reject('Wrong username or password');
            });

            socket.once('connected', function(inGame, _availablePlayers) {

                availablePlayers = _availablePlayers;
                userSocket = socket;
                user = loginData.username;

                deferred.resolve(inGame);
            });

            return deferred.promise;
        },
        launchGame: function(players, mode) {
            var deferred = $q.defer();

            $scope.socket.emit('launch_game', $scope.selectedPlayers, $scope.gameMode);

            setTimeout(function(){ deferred.reject('Timeout on Request'); }, 10000);

            userSocket.once('init', function(gameData) {
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

                deferred.resolve('ok')
            });

            return deferred.promise;
        }
    };

}
