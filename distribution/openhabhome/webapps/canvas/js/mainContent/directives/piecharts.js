/**
 * Created by johngouf on 28/02/14.
 */
var mainContentDisplayer = angular.module('mainContentDisplayer',[]);

mainContentDisplayer.directive('plegmaPiecharts', ['$timeout',
    function(timer) {

        return {
            //restrict it's use to attribute only.
            restrict : 'E',
            replace : true,
            scope : {
                persistence : "@",
                widget: "="
            },
            templateUrl : "templates/plegmapiechart.html?"+millis,

            //set up the directive.
            link : function($scope, elem, attr) {

                console.log("THE SCOPE IS");
                console.log($scope);

                if($scope.widget.type!='Chart')
                {
                    return;
                }

                var args;
                var charttype;
                var range;
                var itemsIds;
                var itemIdsArr = [];

                if($scope.widget.service)
                {
                    args = getValueFromService($scope.widget.service,"args");
                    console.log("THE ARGS ARE");
                    console.log(args);

                    charttype = getValueFromService($scope.widget.service,"charttype");
                    console.log("CHART TYPE");
                    console.log(charttype);

                    var range = getValueFromService($scope.widget.service,"range");
                    if(!range)
                    {
                        range="last_week|now";
                    }
                    var showselector = true;
                    if(range==="last_day|now") showselector = false;
                    console.log(range);

                    itemsIds = getValueFromService($scope.widget.service,"items");
                    itemIdsArr = [];
                    if(itemsIds)
                    {
                        itemIdsArr = itemsIds.split("|");
                    } else {
                        itemIdsArr.push($scope.widget.item.name);
                    }
                }

                var itemIdsLabelDictionary = {};
                var unit;
                $.each(itemIdsArr,function(i,itemId){
                    console.log("for itemId "+itemId);
                    console.log("we have results");
                    var allResults = (getObjectsGenericWithValue($scope.sitemap,"name",itemId,{}));
                    var parent;
                    $.each(allResults,function(i,result){
                        if(result.type=="Text")
                        {
                            parent = result;
                        }
                    });
                    console.log(allResults);
                    console.log(parent);
                    /*                    debugger;*/

                    //var parent = (getObjectsGenericWithValue($scope.sitemap,"name",itemId,{}))[0];
                    console.log("sitemap");
                    console.log($scope.sitemap);
                    console.log('parent0');
                    if(!parent) return;
                    console.log(parent[0]);
                    console.log('parent1');
                    console.log(parent[1]);
                    var label = parent.label.split("[")[0].trim();
                    var matches =  parent.label.match(/\[(.*?)\]/);
                    console.log("matches");
                    console.log(matches);
                    if (matches) {
                        unit = matches[1].split(" ")[1];
                    }
                    itemIdsLabelDictionary[itemId]={label:label};
                    if(unit)
                    {
                        itemIdsLabelDictionary[itemId].unit = unit;
                    }
                    itemIdsLabelDictionary[itemId].labelcolor = parent.labelcolor;
                    itemIdsLabelDictionary[itemId].state = parent.item.state;
                    if(parent.item.state=='Uninitialized')
                    {
                        itemIdsLabelDictionary[itemId].state = 0;
                    }
                });
                console.log("dictionary");
                console.log(itemIdsLabelDictionary);

                //debugger;

                $scope.title = $scope.widget.label;
                $scope.itemid = $scope.widget.item.name;
                $scope.from = range.split("|")[0];
                $scope.to = range.split("|")[1];

                var rawdata;

                var makePiechart = function(){
                    $('#' + $scope.itemid).empty();

                    var piechartData = [];
                    console.log(itemIdsLabelDictionary);

                    for (var i1 = 0; i1 < itemIdsArr.length; i1++)
                    {
                        var itemId = (itemIdsArr[i1]);
                        /*                        debugger;*/
                        piechartData.push([itemIdsLabelDictionary[itemId].label, parseFloat(itemIdsLabelDictionary[itemId].state)]);
                    }

                    $('#' + $scope.itemid).highcharts({
                        chart: {
                            plotBackgroundColor: null,
                            plotBorderWidth: null,
                            plotShadow: false
                        },
                        title: {
                            text: $scope.title
                        },
                        tooltip: {
                            pointFormat: '<b>{point.y}</b>-<b>{point.percentage:.1f}%</b>'
                        },
                        plotOptions: {
                            pie: {
                                allowPointSelect: true,
                                cursor: 'pointer',
                                dataLabels: {
                                    enabled: true,
                                    color: '#000000',
                                    connectorColor: '#000000',
                                    format: '<b>{point.name}</b>: {point.percentage:.1f} %'
                                },
                                showInLegend: true
                            }
                        },
                        series: [{
                            type: 'pie',
                            name: $scope.title,
                            data: piechartData
                        }]
                    },function(chart){
                        setTimeout(function() {
                            /*                            $('#' + $scope.itemid).children(":first").css('height','auto');*/
                            //$('#' + $scope.itemid).children(":first").css('width','auto');
                            //$('#' + $scope.itemid).children(":first").css('text-align','center');
                            //console.log(chart);
                        }, 0);
                    });

                    $( window ).resize(function() {
                        setTimeout(function() {
                        }, 0);
                    });

                };
                timer(function() {
                    makePiechart();
                }, 0);
            },
            controller : function($scope,$state){
                $scope.sitemap = $state.current.data.sitemap;
            }
        }
    }]);