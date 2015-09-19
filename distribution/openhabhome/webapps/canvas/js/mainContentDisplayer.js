/**
 * Created by johngouf on 27/11/13.
 */

var mainContentDisplayer = angular.module('mainContentDisplayer',[]);

var format = "DD/MM/YYYY";

mainContentDisplayer.factory('subscriptionsFactory', function(){
    return {
        subscriptions : []
    }
});

mainContentDisplayer.controller('subscriptionsController', function($scope, $state,subscriptionsFactory){
    $scope.$on('$stateChangeStart',
        function(event, toState, toParams, fromState, fromParams){
            if(toState.name!=fromState.name)
            {
                console.log("we are changing status");
                console.log("the subscriptions pending are "+subscriptionsFactory.subscriptions);
                _.each(subscriptionsFactory.subscriptions,function(subscription){
                    unsubscribe('/rest/sitemaps/'+$.cookie("tovisit")+"/"+subscription);
                });
                subscriptionsFactory.subscriptions = [];
            }
        });
});

mainContentDisplayer.directive('plegmaMorris', ['$timeout',
    function(timer) {

        return {
            //restrict it's use to attribute only.
            restrict : 'E',
            replace : true,
            scope : {
                persistence : "@",
                widget: "="
            },
            templateUrl : "templates/plegmachart.html?"+millis,

            //set up the directive.
            link : function($scope, elem, attr) {
                $scope.title = $scope.widget.label;
                $scope.itemid = $scope.widget.item.name;
                $scope.from = $scope.widget.service.split("|")[0];
                $scope.to = $scope.widget.service.split("|")[1];

                var rawdata;

                var makeChartWith = function(data) {
                    $('#' +$scope.itemid).empty();

                    var measurements = [];
                    if (attr.persistence == "mongodb") {
                        for (var i = 0; i < data[$scope.itemid].length; i++) {
                            var localdata = {};
                            localdata.y = (moment(data[$scope.itemid][i].updated, "MMM DD, YYYY h:mm:ss a").unix() * 1000);
                            localdata.a = (data[$scope.itemid][i].value);
                            measurements.push(localdata);
                        }
                    } else if (attr.persistence == "psql") {
                        for (var i = 0; i < data[$scope.itemid].length; i++) {
                            var localdata = {};
                            localdata.y = data[$scope.itemid][i][0];
                            localdata.a = data[$scope.itemid][i][1];
                            measurements.push(localdata);
                        }
                    }

                    Morris.Line({
                        element : $scope.itemid,
                        data : measurements,
                        xkey : 'y',
                        ykeys : ['a'],
                        labels : [$scope.itemid],
                        lineColors : App.chartColors
                    });
                }
                var makeChart = function() {

                    var fromS = $scope.from;
                    var toS = $scope.to;

                    console.log(fromS);
                    console.log(toS);

                    var calculated = calculateTime(fromS,toS);

                    if (rawdata) {
                        makeChartWith(rawdata);
                    } else {

                        $.ajax({
                            dataType : "json",
                            url : '/' + attr.persistence + 'servlet?fromDate=' + calculated.fromDate + '&toDate=' + calculated.toDate + '&items=' + $scope.itemid,
                            //url: 'http://pleg.no-ip.org/'+attr.persistence+'servlet?fromDate='+calculated.fromDate+'&toDate='+calculated.toDate+'&items='+$scope.itemid,
                            success : function(data) {

                                rawdata = data;

                                makeChartWith(rawdata);
                            }
                        });
                    }

                }
                timer(function() {
                    if (!$('#' + $scope.itemid).length) {
                        return false;
                    }

                    makeChart();

                    $(window).resize(App.debounce(makeChart, 325));
                }, 0);

            }
        }
    }]);

mainContentDisplayer.directive('plegmaRrd4j', ['$timeout', '$http',
    function(timer) {
        return {
            //restrict it's use to attribute only.
            restrict : 'E',
            scope : {
                widget : "="
            },
            templateUrl : "templates/plegmaimg.html?"+millis,
            controller : function($scope)
            {
                if($scope.widget.item)
                {
                    var type = $scope.widget.item.type;
                    if(type=="GroupItem")
                    {
                        $scope.widget.url = "/rrdchart.png?groups="+$scope.widget.item.name+"&period="+$scope.widget.period;
                    }else if(type=="NumberItem")
                    {
                        $scope.widget.url = "/rrdchart.png?items="+$scope.widget.item.name+"&period="+$scope.widget.period;
                    }
                }
            }
        }
    }]);

mainContentDisplayer.directive('plegmaWebview', ['$timeout', '$http',
    function(timer) {
        return {
            //restrict it's use to attribute only.
            restrict : 'E',
            scope : {
                widget : "="
            },
            templateUrl : "templates/plegmawebview.html?"+millis,
            link : function($scope, elem, attr) {
                $scope.title = $scope.widget.label;
            }
        }
    }]);

mainContentDisplayer.directive('plegmaImageview', ['$timeout', '$http',
    function(timer) {
        return {
            //restrict it's use to attribute only.
            restrict : 'E',
            scope : {
                widget : "="
            },
            templateUrl : "templates/plegmaimg.html?"+millis
        }
    }]);

mainContentDisplayer.controller('fixUrlController',function($scope,$sce, $http, $base64){
    $scope.widgetId = $scope.widget.widgetId;
    $scope.myurl= $sce.trustAsResourceUrl($scope.widget.url+"&auth="+ $.cookie("hashed"));
});

mainContentDisplayer.controller('rowController',function($scope){
    console.log("rowController the final Widgets");
    console.log($scope.widgets);

    var max = {
        chart : 1,
        morris : 1,
        webview : 1,
        text : 3,
        image : 1,
        rrd4j : 1,
        piechart : 1,
        state: 3,
        gauge: 3
    };

    var widgetsToShow = 0;

    var widgetHighcharts = [];
    var widgetPiecharts = [];
    var widgetMorris = [];
    var widgetTexts = [];
    var widgetsWebviews = [];
    var widgetsImages = [];
    var widgetsRRD4J = [];
    var widgetsGauge = [];

    $scope.widgetFragments = [];

    _.each($scope.widgets,function(widget){
        //TODO Remove this dirty hack for chart without service field
        var type;
        if(widget.type=="Chart"){
            {
                console.log("I got chart");
                console.log(widget);
                //debugger;

                if(widget.service)
                {
                    console.log("I got service");
                    var charttype = getValueFromService(widget.service,"charttype");
                    console.log(charttype);
                    //debugger;
                    if(charttype=="piecharts")
                    {
                        widgetPiecharts.push(widget);
                        type='piechart';
                    } else if(charttype=='gauge')
                    {
                        widgetsGauge.push(widget);
                        type='gauge';
                    }
                    else if(charttype=="highcharts"||charttype=="barcharts")
                    {
                        widgetHighcharts.push(widget);
                        type = "chart";
                    } else if(charttype=="morris")
                    {
                        widgetMorris.push(widget);
                        type = "morris";
                    } else {
                        /*widgetHighcharts.push(widget);
                         type = "chart";*/
                    }
                } else {
                    type = "rrd4j";
                    widgetsRRD4J.push(widget);
                }
            }
        }
        else if(widget.type=="Text"&&widget.item&&widget.item.state){
            type = "text";
            widgetTexts.push(widget);
        } else if(widget.type=="Text"&&!widget.linkedPage){
            widget.dummy = true;
            widgetTexts.push(widget);
            type = "text";
        }
        else if(widget.type=="Webview"){
            widgetsWebviews.push(widget);
            type = "webview"
        } else if(widget.type=="Image")
        {
            widgetsImages.push(widget);
            type = "image";
        }
        else {console.log("there is also "+widget.type);}
        if(type)
        {
            if($scope.widgetFragments.length==0)
            {
                var objToPush = {type : type};
                objToPush[type] = [];
                objToPush[type].push(widget);

                $scope.widgetFragments.push(objToPush);
            } else {
                var latestType = $scope.widgetFragments[$scope.widgetFragments.length-1].type;
                var maximumForType = max[type];
                if(latestType!=type)
                {
                    var objToPush = {type : type};
                    objToPush[type] = [];
                    objToPush[type].push(widget);

                    $scope.widgetFragments.push(objToPush);

                } else {
                    var sizeBefore = $scope.widgetFragments[$scope.widgetFragments.length-1][latestType].length;
                    if(sizeBefore==maximumForType)
                    {
                        var objToPush = {type : type};
                        objToPush[type] = [];
                        objToPush[type].push(widget);

                        $scope.widgetFragments.push(objToPush);

                    } else {
                        $scope.widgetFragments[$scope.widgetFragments.length-1][latestType].push(widget);
                        /* console.log($scope.widgetFragments[$scope.widgetFragments.length-1][sizeBefore-1]);
                         $scope.widgetFragments[$scope.widgetFragments.length-1].push({type:type,widget:widget});*/
                    }
                }
            }
        }
    });

    console.log($scope.widgetFragments);
    //debugger;
    widgetsToShow = widgetHighcharts.length+widgetMorris.length+ widgetTexts.length + widgetsWebviews.length + widgetsImages.length + widgetsRRD4J.length;

    $scope.rowsHighcharts = chunk(widgetHighcharts, 1);
    $scope.rowsMorris = chunk(widgetMorris, 1);
    $scope.rowsWebviews = chunk(widgetsWebviews, 1);
    $scope.rowsTexts = chunk(widgetTexts, 3);
    $scope.rowsImages = chunk(widgetsImages, 1);
    $scope.rowsRRD4J = chunk(widgetsRRD4J,1);

    console.log($scope.rowsTexts);

    //debugger;

    if(widgetsToShow==0&&$scope.children)
    {
        $scope.showLinks = true;

        console.log("the scope children are");
        console.log($scope.children);
        var type="state";
        var childrenDictionary = {};
        var isHome = false;
        var widgetsToCheck = [];
        if(!$scope.widgets){
            isHome=true;
            widgetsToCheck = $scope.children;
        }
        _.each($scope.children,function(widget){
            childrenDictionary[widget.label]=widget;
        });

        _.each($scope.widgets,function(widget){
            var label = widget.label;
            if(label in childrenDictionary)
            {
                widgetsToCheck.push(childrenDictionary[label]);
            }
        });

        _.each(widgetsToCheck,function(widget){

            if($scope.widgetFragments.length==0)
            {
                var objToPush = {type : type};
                objToPush[type] = [];
                objToPush[type].push(widget);

                $scope.widgetFragments.push(objToPush);
            } else {
                var latestType = $scope.widgetFragments[$scope.widgetFragments.length-1].type;
                var maximumForType = max[type];
                if(latestType!=type)
                {
                    var objToPush = {type : type};
                    objToPush[type] = [];
                    objToPush[type].push(widget);

                    $scope.widgetFragments.push(objToPush);

                } else {
                    var sizeBefore = $scope.widgetFragments[$scope.widgetFragments.length-1][latestType].length;
                    if(sizeBefore==maximumForType)
                    {
                        var objToPush = {type : type};
                        objToPush[type] = [];
                        objToPush[type].push(widget);

                        $scope.widgetFragments.push(objToPush);

                    } else {
                        $scope.widgetFragments[$scope.widgetFragments.length-1][latestType].push(widget);
                    }
                }
            }
        });

    } else {
        $scope.showLinks = false;
    }
    console.log($scope.widgetFragments);
});
