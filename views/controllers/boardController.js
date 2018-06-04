angular
    .module( 'hanabi.controllers' )
    .controller( 'boardController', [ '$scope', '$state', 'userService', boardController ] );

function boardController( $scope, $state, userService ) {

    $scope.selectedPlayers = undefined;

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
        console.log($scope.selectedPlayers, $scope.gameMode);
    };

}
