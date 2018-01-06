angular
    .module( 'hanabi.controllers' )
    .controller( 'gameController', [ '$scope', '$state', 'userService', gameController ] );

function gameController( $scope, $state, userService ) {

    $scope.gameData = userService.getGame();
    $scope.socket = userService.getSocket();
    $scope.username = userService.getUser();
    console.log($scope.gameData);
    $scope.highlighted = new Array($scope.gameData.cardsPerPlayer).fill(false);

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
