/**
 * Created by johngouf on 27/02/14.
 */
var mainContentDisplayer = angular.module('mainContentDisplayer',[]);

mainContentDisplayer.directive('plegmaGauge', ['$timeout',
    function(timer) {

        Highcharts.setOptions({
            global: {
                useUTC: true
            }
        });

        return {
            //restrict it's use to attribute only.
            restrict : 'E',
            replace : true,
            scope : {
                persistence : "@",
                widget: "=",
                value: "&",
                unit : "&"
            },
            templateUrl : "templates/plegmapiechart.html?"+millis,

            //set up the directive.
            link : function($scope, elem, attr){

                $scope.value = 0;

                if($scope.widget.type!='Chart')
                {
                    return;
                }

                var itemsIds;
                var itemIdsArr = [];
                var min,max;

                if($scope.widget.service)
                {

                    itemsIds = getValueFromService($scope.widget.service,"items");
                    itemIdsArr = [];
                    if(itemsIds)
                    {
                        itemIdsArr = itemsIds.split("|");
                    } else {
                        itemIdsArr.push($scope.widget.item.name);
                    }
                    min = parseFloat(getValueFromService($scope.widget.service,"min"));
                    max = parseFloat(getValueFromService($scope.widget.service,"max"));
                }

                var itemIdsLabelDictionary = {};
                var unit;
                $.each(itemIdsArr,function(i,itemId){
                    var allResults = (getObjectsGenericWithValue($scope.sitemap,"name",itemId,{}));
                    var parent;
                    $.each(allResults,function(i,result){
                        if(result.type=="Text")
                        {
                            parent = result;
                        }
                    });

                    if(!parent) return;

                    var label = parent.label.split("[")[0].trim();
                    var matches =  parent.label.match(/\[(.*?)\]/);
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

                $scope.title = $scope.widget.label;
                $scope.itemid = $scope.widget.item.name;
                console.log($scope.widget);
                console.log($scope.itemid);

                var makeChart = function() {
                    $('#' + $scope.itemid).empty();

                    var highchart = {

                        chart: {
                            renderTo: 'container',
                            type: 'gauge',
                            plotBorderWidth: 1,
                            plotBackgroundColor: {
                                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                                stops: [
                                    [0, '#FFF4C6'],
                                    [0.3, '#FFFFFF'],
                                    [1, '#FFF4C6']
                                ]
                            },
                            plotBackgroundImage: null,
                            events : {
                                load : function(chart){
                                    $('#' + $scope.itemid).removeClass("hidden");
                                    $('#' + $scope.itemid+"-loading").addClass("hidden");
                                }
                            }
                        },

                        title: {
                            text: ''
                        },

                        pane: {
                            startAngle: -150,
                            endAngle: 150
                        },

                        yAxis: [{
                            min: min,
                            max: max,
                            minorTickPosition: 'outside',
                            tickPosition: 'outside',
                            labels: {
                                rotation: 'auto',
                                distance: 20
                            },
                            plotBands: [{
                                from: 0,
                                to: 6,
                                color: '#C02316',
                                innerRadius: '100%',
                                outerRadius: '105%'
                            }],
                            pane: 0
                            /*title: {
                                text: 'VU<br/><span style="font-size:8px">Channel A</span>',
                                y: -40
                            }*/
                        }],

                        series: [{
                            name: itemIdsLabelDictionary[itemIdsArr[0]].label,
                            data: [parseFloat(itemIdsLabelDictionary[itemIdsArr[0]].state)],
                            tooltip: {
                                valueSuffix: ' '+itemIdsLabelDictionary[itemIdsArr[0]].unit
                            },
                            dataLabels : {
                                formatter : function() {
                                    var value = this.y;
                                    return value+" "+itemIdsLabelDictionary[itemIdsArr[0]].unit;
                                }
                            }
                        }]
                    };

                    $('#' + $scope.itemid).highcharts(highchart,function(chart){
                        subcribeGauge($scope.itemid,$scope,chart);
                    });
                }
                timer(function() {
                    makeChart();
                }, 0);
            },
            controller : function($scope,$state){
                $scope.sitemap = $state.current.data.sitemap;
            }
        }
    }]);

var socket = $.atmosphere;
var force_transport = 'websocket';
var fallbackProtocol = 'streaming';

function subcribeGauge(itemId,scope,chart)
{
    var location = "/rest/items/"+itemId;
    console.log("subscribed="+location);

    var request = { url : location,
        maxRequest : 256,
        timeout: 59000,
        attachHeadersAsQueryString : true,
        executeCallbackBeforeReconnect : false,
        //transport: 'long-polling',
        transport: force_transport,
        fallbackTransport: fallbackProtocol,
        headers: {Accept: "application/json"}
    };

    request.onError = function (response) {
        console.log('------ ERROR -------');
        console.log(response);
    }
    request.onOpen = function(response) {
        //console.log('-------- OPEN --------');
        //console.log(response);
        detectedTransport = response.transport;
    }

    request.onMessage = function (response) {

        console.log("GOT MESSAGE");
        //console.log(response.responseBody);

        if (response.status == 200) {
            var data = response.responseBody;
            if (data.length > 0) {
                try{
                    var value = JSON.parse(data).state;
                    var chartData = chart.series[0].points[0];
                    chartData.update(parseFloat(value),false);
                    chart.redraw();
                } catch(e) {
                }
            }
        }
    };

    socket.subscribe(request);
}