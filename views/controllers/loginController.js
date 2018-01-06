angular
    .module( 'hanabi.controllers' )
    .controller( 'loginController', [ '$scope', '$state', 'userService', loginController ] );

function loginController( $scope, $state, userService ) {

    $scope.loginError = '';

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
        $scope.loginError = '';
        userService.connectionAttempt($scope.loginData).then(
            function(success) {
                console.log(success);
                $state.go('main.game');
                //$state.reload();
            }, function(error) {
                console.log(error);
                $scope.loginError = error;
                if (!$scope.$$phase) $scope.$digest();
            });
    };

}
