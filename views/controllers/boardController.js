angular
    .module( 'hanabi.controllers' )
    .controller( 'boardController', [ '$scope', '$state', 'userService', boardController ] );

function boardController( $scope, $state, userService ) {

    $scope.selectedPlayers = [];
    $scope.alert = undefined;
    $scope.socket = userService.getSocket();
    $scope.username = userService.getUser();
    $scope.playersList = userService.getAvailablePlayers();
    $scope.useHash = false;
    $scope.hash = {"code": undefined};

    $scope.gameMode = 'normal';

    $scope.goEasy = function() {
        $scope.gameMode = 'easy';
    };

    $scope.goNormal = function() {
        $scope.gameMode = 'normal';
    };

    $scope.goHard = function() {
        $scope.gameMode = 'hard';
    };

    $scope.socket.once('invitation', function(players) {
        if (players.includes($scope.username)) {
            userService.launchGame(true).then(
                function(success) {
                    $state.go('main.game');
                }, function(error) {
                    $scope.alert = error;
                    if (!$scope.$$phase) $scope.$digest();
                });
        };
    });

    $scope.launch = function() {
        if ($scope.selectedPlayers.length < 1 || $scope.selectedPlayers.length > 4) {
            $scope.alert = "Wrong number of Teammates";
            if (!$scope.$$phase) $scope.$digest();
        } else if ($scope.gameMode === 'easy' && $scope.useHash === true) {
            $scope.alert = "Hash unavailable in easy mode";
            if (!$scope.$$phase) $scope.$digest();
        } else {
            $scope.selectedPlayers.push($scope.username);
            var hash = undefined;
            if ($scope.useHash && $scope.gameMode != 'easy') {hash = $scope.hash.code};
            userService.launchGame(false, $scope.selectedPlayers, $scope.gameMode, hash).then(
                function(success) {
                    $state.go('main.game');
                }, function(error) {
                    $scope.alert = error;
                    if (!$scope.$$phase) $scope.$digest();
                });
        };
    };

}
