/**
 * Created by johngouf on 24/11/13.
 */
var plegmaApp = angular.module("plegmaApp", ['loginModule','routeNavBuilder','mainContentDisplayer']);

plegmaApp.run(
    ['$rootScope', '$templateCache',
        function ($rootScope,$templateCache ) {
            $rootScope.contentNotLoaded = true;

            $rootScope.$on('$viewContentLoaded', function() {
                $templateCache.removeAll();
            });

        }
    ]);

plegmaApp.controller("rootController",function($scope){
    $scope.date = moment().format('MMM DD YYYY - HH:mm');
    $scope.logout = function() {
        $.cookie("hashed", '');
        $.cookie("user",'');
        location.reload();
    }

});