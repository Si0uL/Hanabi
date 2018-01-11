angular
    .module( 'hanabi.controllers' )
    .controller( 'gameController', [ '$scope', '$state', 'userService', gameController ] );

function gameController( $scope, $state, userService ) {

    $scope.gameData = userService.getGame();
    $scope.socket = userService.getSocket();
    $scope.username = userService.getUser();
    $scope.highlighted = new Array($scope.gameData.cardsPerPlayer).fill(false);

    // Game event listeners
    $scope.highlighted = new Array($scope.gameData.cardsPerPlayer).fill(false);

    $scope.socket.on('redraw', function(data) {
        data.hand.reverse();
        $scope.gameData.hands[data.pseudo] = data.hand;
        userService.setGame($scope.gameData);
        if (!$scope.$$phase) $scope.$digest();
    });

    $scope.socket.on('redraw_mine', function(data) {
        $scope.gameData.your_cards_angles = data;
        for (var i = 0; i < $scope.gameData.your_cards_angles.length; i++) {
            $scope.gameData.your_cards_angles[i] = {angle: data[i], index: i, noCard: $scope.gameData.your_cards_angles[i] === -1};
        };
        userService.setGame($scope.gameData);
        // cancel potential highlighting
        for (var i = 0; i < $scope.highlighted.length; i++) {
            $scope.highlighted[i] = false;
        };
        if (!$scope.$$phase) $scope.$digest();
    });

    $scope.socket.on('notify', function(message) {
        alert('Notification:\n\n' + message);
    });

    $scope.socket.on('played', function(color) {
        $scope.gameData.found[color] ++;
        $scope.gameData.remainingCards --;
        if (!$scope.$$phase) $scope.$digest();
    });

    $scope.socket.on('discarded', function(card) {
        $scope.gameData.discarded.push(card);
        $scope.gameData.remainingCards --;
        if (!$scope.$$phase) $scope.$digest();
    });

    $scope.socket.on('info', function(str) {
        if (str === 'add') {
            $scope.gameData.informations ++;
        } else {
            $scope.gameData.informations --;
        }
        if (!$scope.$$phase) $scope.$digest();
    });

    $scope.socket.on('warning', function(data) {
        $scope.gameData.warnings ++;
        if (!$scope.$$phase) $scope.$digest();
        alert('Warning: \n\n' + data.pseudo + ' attempted to play the ' + data.card.color + ' ' + data.card.number);
    });

    $scope.socket.on('next_turn', function(data) {
        // cancel potential highlighting
        for (var i = 0; i < $scope.highlighted.length; i++) {
            $scope.highlighted[i] = false;
        };
        alert('New Turn:\n\n' + data.lastPlay + '\n - \n' + data.playerUp + " is up!"); // bugs, duunno why
        $scope.gameData.nextToPlay = data.playerUp;
        $scope.gameData.lastPlay = data.lastPlay;
        // If an info is given to me, highlight the related cards
        if (data.lastPlay.includes('says')) {
            var str = data.lastPlay.split('-')[0].split('says')[1];
            if (str.includes($scope.username)) {
                var aux = str.split('position')[1].replace(/[^0-9,]/g, '').split(',');
                aux.forEach(function(elt) {
                    $scope.highlighted[Number(elt)-1] = true;
                })
            }
        }
        if (!$scope.$$phase) $scope.$digest();
    });

    $scope.socket.on('game_end', function(message) {
        alert('Game Finished:\n\n' + message);
    });

    $scope.play = function(index) {
        $scope.socket.emit('playRequest', String(index));
    };

    $scope.delete = function(index) {
        $scope.socket.emit('discardRequest', String(index));
    };

    $scope.rotateLeft = function(index) {
        $scope.socket.emit('rotateRequest', {id: index, angle: 90});
    };

    $scope.rotateRight = function(index) {
        $scope.socket.emit('rotateRequest', {id: index, angle: -90});
    };

    // Chat
    $scope.toSend = { text:'' };
    $scope.messages = [];

    $scope.socket.emit('message_history_request');

    $scope.socket.on('message_history', function(history) {
        $scope.messages = history;
        $scope.messages.forEach(function(elt,n) {
            if (elt.pseudo === $scope.username) $scope.messages[n].pseudo = 'You'
        });
        if (!$scope.$$phase) $scope.$digest();
    });

    $scope.send = function() {
        $scope.socket.emit('message', $scope.toSend.text);
        $scope.toSend.text = '';
    };

    $scope.socket.on('message', function(data) {
        $scope.messages = [{pseudo: data.pseudo, message: data.message}].concat($scope.messages);
        if (!$scope.$$phase) $scope.$digest();
    });

}
