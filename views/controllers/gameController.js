angular
    .module( 'hanabi.controllers' )
    .controller( 'gameController', [ '$scope', '$state', 'userService', gameController ] );

function gameController( $scope, $state, userService ) {

    $scope.gameData = userService.getGame();
    console.log($scope.gameData);
    $scope.highlighted = new Array($scope.gameData.cardsPerPlayer).fill(false);

}
