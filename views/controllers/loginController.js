angular
    .module( 'hanabi.controllers' )
    .controller( 'loginController', [ '$scope', '$state', 'userService', loginController ] );

function loginController( $scope, $state, userService ) {

    $scope.loginError = '';
    $scope.logged = false;

    $scope.loginData = {
        server: '',
        username: '',
        password: '',
    };

    $scope.keyInput = function($event) {
        if ($event.keyCode === 13) {
            $scope.signIn();
        };
    };

    $scope.signIn = function() {
        console.log($scope.loginData);
        
    };

}
