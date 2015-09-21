/**
 * Created by johngouf on 03/01/14.
 */
var loginModule = angular.module("loginModule",['base64']);

loginModule.controller('formController',function($scope,$state,$http,$base64){
    $scope.username='';
    $scope.password='';
    $scope.error = '';

    $scope.submitForm = function(){
        if($scope.username.length==0||$scope.password.length==0)
        {
            $scope.error = "Please fill both username and password";
            return;
        }
        $http.defaults.headers.common['Authorization'] = 'Basic ' + $base64.encode($scope.username+":"+$scope.password);
        $http.post('../loginservlet', { foo: 'bar' })
            .success(function(response){

                $.cookie("hashed", $base64.encode($scope.username+":"+$scope.password));
                $.cookie("user",$scope.username);
                if(!$.cookie("tovisit"))
                {
                    $.cookie("tovisit","demo");
                }
                location.reload();

            }).error(function(response){
                $scope.error = "Invalid username/password";
            });
    };
});
