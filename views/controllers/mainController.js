angular
    .module( 'hanabi.controllers' )
    .controller( 'mainController', [ '$scope', '$state', 'userService', mainController ] );

function mainController( $scope, $state, userService ) {

    $scope.user = userService.getUser();

    $scope.logout = function() {
        $state.go('login');
    };

    $scope.date = '' + new Date().getHours() + ':' + new Date().getMinutes();

}
