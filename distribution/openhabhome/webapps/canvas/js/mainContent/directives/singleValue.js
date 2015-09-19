/**
 * Created by johngouf on 28/02/14.
 */
var mainContentDisplayer = angular.module('mainContentDisplayer',[]);

mainContentDisplayer.directive('plegmaSingleValue',['subscriptionsFactory',
    function(subscriptionsFactory) {
        return {
            //restrict it's use to attribute only.
            restrict : 'E',
            replace : true,
            scope : {
                widget : "=",
                value: "&",
                unit : "&"
            },
            templateUrl : "templates/plegmasinglevalue.html?"+millis,
            //set up the directive.
            link : function($scope, elem, attr) {

                var initLabel;
                var itemId;
                var equals;
                console.log($scope.widget);
                //debugger;

                if($scope.widget.dummy)
                {
                    return;
                }

                if($scope.widget)
                {
                    initLabel = ($scope.widget.label);
                    itemId = $scope.widget.item.name;
                    equals = getObjectsGenericWithValue($scope.sitemap,"name",itemId,{});
                } else {
                    itemId = attr.itemid;
                    console.log("itemId");
                    console.log(itemId);
                    equals = getObjectsGenericWithValue($scope.sitemap,"name",itemId,{});
                    console.log("equals");
                    console.log(equals);
                    initLabel = equals[0].label;
                }

                $scope.itemid = itemId;

                console.log("equals");
                console.log(equals);

                if(initLabel)
                {
                    var scopeLabel = initLabel.split("[")[0];
                    $scope.label = scopeLabel;
                    var matches = initLabel.match(/\[(.*?)\]/);
                    if (matches) {
                        var submatch = matches[1];
                        var submatchArr = submatch.split(" ");
                        $scope.value = submatchArr[0];
                        $scope.unit = submatchArr[1];
                        console.log("submatch");
                        console.log(submatch);
                    }
                }

                console.log("current state");
                console.log($scope.state);

                subscribe('/rest/sitemaps/'+$.cookie("tovisit")+"/"+$scope.state.name,$scope);
                subscriptionsFactory.subscriptions.push(itemId);

            },
            controller : function($scope,$state){
                $scope.sitemap = $state.current.data.sitemap;
                $scope.state = $state.current;
            }
        }
    }]);