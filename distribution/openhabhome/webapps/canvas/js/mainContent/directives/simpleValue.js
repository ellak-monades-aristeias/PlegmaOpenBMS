/**
 * Created by johngouf on 28/02/14.
 */
var mainContentDisplayer = angular.module('mainContentDisplayer',[]);

mainContentDisplayer.directive('plegmaSimpleValue',['subscriptionsFactory',
    function(subscriptionsFactory) {
        return{
            restrict:'E',
            template : "{{value}}",
            scope: {
                value: "&",
                unit : "&"
            },
            link : function($scope, elem, attr) {
                var itemId = attr.itemid;
                console.log("itemId");
                console.log(itemId);
                var equals = getObjectsGenericWithValue($scope.sitemap,"name",itemId,{});
                console.log('plegmaSimpleValue');
                console.log("equals");
                console.log(equals);
                $scope.value = "";
                if(equals[0]&&equals[0].item)
                {
                    console.log("condition ok");
                    $scope.value = equals[0].item.state;
                } else {
                    $scope.value = "";
                }

                subscribe('/rest/sitemaps/'+$.cookie("tovisit")+"/"+itemId,$scope);
                subscriptionsFactory.subscriptions.push(itemId);

            },
            controller : function($scope,$state){
                $scope.sitemap = $state.current.data.sitemap;
            }
        }
    }]);