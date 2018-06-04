angular
    .module( 'hanabi.controllers' )
    .controller( 'boardController', [ '$scope', '$state', 'userService', boardController ] );

function boardController( $scope, $state, userService ) {

    $scope.selectedPlayers = [];
    $scope.alert = undefined;
    $scope.socket = userService.getSocket();
    $scope.username = userService.getUser();

    $scope.playersList = [
        'Louis',
        'Kant',
        'Zensio',
        'kzjdgb',
        'iushv',
        'osudhv0',
        'vj',
        'sdouvh',
        'soduvh',
        'sycv',
    ];

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


    $scope.launch = function() {
        if ($scope.selectedPlayers.length < 1 || $scope.selectedPlayers.length > 4) {
            $scope.alert = "Wrong number of Teammates";
            if (!$scope.$$phase) $scope.$digest();
        } else {
            $scope.selectedPlayers.push($scope.usename);
            userService.launchGame($scope.selectedPlayers, $scope.gameMode).then(
                function(success) {
                    $state.go('main.game');
                }, function(error) {
                    $scope.alert = error;
                    if (!$scope.$$phase) $scope.$digest();
                });
            });
        }
    };

}
