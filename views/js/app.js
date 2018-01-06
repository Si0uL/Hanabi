angular.module( 'hanabi.controllers', []);
angular.module( 'hanabi.services', []);

angular.module('hanabi', ['ui.router', 'hanabi.controllers', 'hanabi.services' ])

.run([function() {

}])

.config(['$stateProvider', '$urlRouterProvider' , function($stateProvider, $urlRouterProvider) {

    $stateProvider

    // Login route (!logged).
    .state('login', {
        url: '/login',
        templateUrl: 'templates/login.html',
        controller: 'loginController'
    })

    // Main route (logged).
    .state('main', {
        url: '/main',
        templateUrl: 'templates/main.html',
        controller: 'mainController',
        abstract: true,
        /* LATER
        resolve: {
            check: ['$timeout', 'userService', '$state', function($timeout, userService, $state) {
                $timeout(function() {
                    if(!userService.issetLocalUser()) {
                        $state.go('login');
                    }
                }, 0);
            }]
        }
        */
    })

    // Main.game route.
    .state('main.game', {
        url: '/game',
        templateUrl: 'templates/game.html',
        controller: 'gameController'
    })

    // Main.replayer route.
    .state('main.replayer', {
        url: '/replayer',
        templateUrl: 'templates/replayer.html',
        controller: 'replayerController',
    })

    // Default route.
    $urlRouterProvider.otherwise('/login');

}]);
