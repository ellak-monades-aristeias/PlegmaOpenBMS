/**
 * Created by johngouf on 27/02/14.
 */
(function(angular) {
    var origMethod = angular.module;

    var alreadyRegistered = {};

    /**
     * Register/fetch a module.
     *
     * @param name {string} module name.
     * @param reqs {array} list of modules this module depends upon.
     * @param configFn {function} config function to run when module loads (only applied for the first call to create this module).
     * @returns {*} the created/existing module.
     */
    angular.module = function(name, reqs, configFn) {
        reqs = reqs || [];
        var module = null;

        if (alreadyRegistered[name]) {
            module = origMethod(name);
            module.requires.push.apply(module.requires, reqs);
        } else {
            module = origMethod(name, reqs, configFn);
            alreadyRegistered[name] = module;
        }

        return module;
    };

})(angular);

function chunk(a, s) {
    var i, _i, _ref, _results;
    if (a.length === 0) {
        return [];
    } else {
        _results = [];
        for (i = _i = 0, _ref = a.length - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = _i += s) {
            _results.push(a.slice(i, (i + s - 1) + 1 || 9e9));
        }
        return _results;
    }
};

function calculateTime(fromS,toS)
{
    var fromDate;
    if (fromS === "zero")
        fromDate = moment().year(1970).unix();
    else if (fromS === "last_hour")
        fromDate = moment().subtract("hours", 1).unix();
    else if (fromS === "last_day")
        fromDate = moment().subtract("days", 1).unix();
    else if (fromS === "last_week")
        fromDate = moment().subtract("days", 7).unix();
    else if (fromS === "last_month")
        fromDate = moment().subtract("months", 1).unix();
    else if (fromS === "last_year")
        fromDate = moment().subtract("years", 1).unix();
    else if (fromS === "all")
        fromDate = 0;
    else if (fromS === "start_day")
        fromDate = moment().hours(0).minutes(0).seconds(0).unix();
    else
        fromDate = moment(fromS, format).unix();

    var toDate;
    if (toS === "now")
        toDate = moment().unix();
    else
        toDate = moment(toS, format).hours(23).minutes(59).seconds(59).unix();
    return {'fromDate':fromDate,'toDate':toDate};
}

function getValueFromService(servicestr,value)
{
    var toRet = null;
    var propertiesArr = servicestr.split(",");
    
    _.each(propertiesArr,function(property){
        
        
        
        
        
        
        if(property.split("=")[0]==value) {
            
            toRet = property.split("=")[1];
        }
    });
    return toRet;
}

var socket = $.atmosphere;
var force_transport = 'websocket';
var fallbackProtocol = 'streaming';

function subscribe(location,$scope,chart) {

    
    

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
        
        
    }
    request.onOpen = function(response) {
        //
        //
        detectedTransport = response.transport;
    }

    request.onMessage = function (response) {

        
        //

        if (response.status == 200) {
            var data = response.responseBody;
            if (data.length > 0) {
                try{
                    
                    //debugger;
                    
                    
                    
                    
                    var equals = getObjectsGenericWithValue(JSON.parse(data),"name",$scope.itemid,{});
                    
                    
                    var initLabel = equals[0].label;
                    var matches = initLabel.match(/\[(.*?)\]/);
                    if (matches) {
                        var submatch = matches[1];
                        var submatchArr = submatch.split(" ");
                        $scope.value = submatchArr[0];
                        if(chart)
                        {
                            var valueInChart = chart.series[0].points[0];
                            valueInChart.update($scope.value, false);
                            chart.redraw();
                        }
                        $scope.unit = submatchArr[1];
                        
                        
                        $scope.$apply();
                    }

                    /*var unit = $scope.value.split(" ")[1];
                     var jsonObject = JSON.parse(response.responseBody);
                     $scope.value = jsonObject.state;
                     $scope.$apply();*/
                } catch(e) {
                }
            }
        }
    };

    socket.subscribe(request);
}

function unsubscribe(){
    socket.unsubscribe();
}/**
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
        
        
    }
    request.onOpen = function(response) {
        //
        //
        detectedTransport = response.transport;
    }

    request.onMessage = function (response) {

        
        //

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
}/**
 * Created by johngouf on 27/02/14.
 */
var mainContentDisplayer = angular.module('mainContentDisplayer',[]);

mainContentDisplayer.directive('plegmaHighchartsDynamic', ['$timeout',
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
                widget: "="
            },
            templateUrl : "templates/plegmachartdynamic.html?"+millis,

            //set up the directive.
            link : function($scope, elem, attr) {

                if($scope.widget.type!='Chart')
                {
                    return;
                }

                var charttype;
                var range;
                var itemsIds;
                var itemIdsArr = [];

                if($scope.widget.service)
                {
                    $scope.args = getValueFromService($scope.widget.service,"args");
                    charttype = getValueFromService($scope.widget.service,"charttype");

                    $scope.stacked = getValueFromService($scope.widget.service, "stacked");
                    

                    var range = getValueFromService($scope.widget.service,"range");
                    if(!range)
                    {
                        range="last_week|now";
                    }
                    var showselector = true;

                    if(range==="last_day|now") showselector = false;

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
                $scope.from = range.split("|")[0];
                $scope.to = range.split("|")[1];

                var rawdata;

                var durationsDictionary =
                    [{
                        type : 'hour',
                        count : 1,
                        text : 'h',
                        custom : 'last_hour'
                    }, {
                        type : 'day',
                        count : 1,
                        text : 'd',
                        custom: 'last_day'
                    }, {
                        type : 'day',
                        count : 7,
                        text : 'w',
                        custom: 'last_week'
                    }, {
                        type : 'month',
                        count : 1,
                        text : 'm',
                        custom: 'last_month'
                    }, {
                        type : 'year',
                        count : 1,
                        text : 'y',
                        custom: 'last_year'
                    }, {
                        type : 'all',
                        count : 1,
                        text : 'All',
                        custom : 'all'
                    }];

                var makeChartWith = function(data) {
                    $('#' + $scope.itemid).empty();

                    var seriesOptions = [];
                    var webserviceFormat;

                    if(charttype=='barcharts')
                    {
                        if($scope.args=='deltahour')
                        {
                            webserviceFormat = "YYYY-MM-DD HH";
                        } else if($scope.args=='delta'){
                            webserviceFormat = "YYYY-MM-DD";
						} else if($scope.args=='peakday'){
                            webserviceFormat = "YYYY-MM-DD";
                        }
                    }

                    //TODO please fix this to work for mongodb as well
                    if (attr.persistence == "mongodb") {
                        for (var i = 0; i < data[$scope.itemid].length; i++) {
                            var localdata = {};
                            localdata.y = (moment(data[attr.itemid][i].updated, "MMM DD, YYYY h:mm:ss a").unix() * 1000);
                            localdata.a = (data[attr.itemid][i].value);
                            measurements.push(localdata);
                        }
                    } else if (attr.persistence == "psql") {
                        for (var i1 = 0; i1 < itemIdsArr.length; i1++) {
                            var itemdata = [];
                            for (var i = 0; i < data[itemIdsArr[i1]].length; i++) {
                                var localdata = [];
                                if(i==0)
                                {
                                    
                                    
                                }
                                // 
                                localdata.push(moment.utc(data[itemIdsArr[i1]][i][0],webserviceFormat).unix() * 1000);
                                localdata.push(data[itemIdsArr[i1]][i][1]);
                                itemdata.push(localdata);
                            }
                            
                            
                            var toDisplay;
                            if(itemIdsLabelDictionary[itemIdsArr[i1]]) toDisplay = itemIdsLabelDictionary[itemIdsArr[i1]].label;
                            else toDisplay = itemIdsArr[i1];
                            seriesOptions[i1] = {
                                name : toDisplay,
                                data : itemdata
                            };
                            if(charttype=='barcharts')
                            {
                                seriesOptions[i1].type = 'column';
                            }
                            if(itemIdsLabelDictionary[itemIdsArr[i1]]&&itemIdsLabelDictionary[itemIdsArr[i1]].labelcolor)
                            {
                                seriesOptions[i1].color = itemIdsLabelDictionary[itemIdsArr[i1]].labelcolor;
                            }
                        }
                        
                    }
                    if(charttype=='highcharts')
                    {
                        var localFormat = "MMM D, YYYY";
                        var rangeTime = calculateTime($scope.from,$scope.to);
                        var startDate = moment(rangeTime.fromDate*1000).format(localFormat);
                        var endDate = moment(rangeTime.toDate*1000).format(localFormat);

                        var highchart ={
                            loading: {
                                style: {
                                    opacity: 0.8,
                                    backgroundColor: '#D3D3D3'
                                }
                            },
                            chart : {
                                events: {
                                    load: function (event) {
                                        $('.highcharts-input-group g:lt(2)',$('#' + $scope.itemid)).remove();
                                        $('.highcharts-input-group g:gt(0)',$('#' + $scope.itemid)).find('tspan').html(startDate+" - "+endDate);
                                    }
                                }
                            },
                            exporting:{
                                chartOptions:{
                                    title: {
                                        text: $scope.title
                                    }
                                }
                            },
                            xAxis: {
                                ordinal: true
                            },
                            yAxis: {
                                labels: {
                                    format: '{value} '+unit
                                },
                                min:0,
                                startOnTick: false
                            },
                            tooltip : {
                                formatter: function() {
                                    
                                    
                                    
                                    var formateddate = moment.utc(this.x).format('MMM D YYYY - HH:mm');
                                    var s =  '<b>'+ formateddate +'</b>';
                                    $.each(this.points, function(i, point) {
                                        var value = point.y;
                                        if((value%1)!= 0)
                                        {
                                            value = value.toFixed(2);
                                        }
                                        s += '<br/><p style="color:'+point.series.color+'">'+ point.series.name +'</p>: '+value+' '+unit;
                                    });
                                    
                                    return s;
                                },
                                shared: true
                            },
                            rangeSelector : {
                                buttons : durationsDictionary,
                                inputEnabled : true,
                                enabled:true
                            },

                            navigator : {
                                enabled : showselector
                            },

                            scrollbar : {
                                enabled : showselector
                            },

                            legend: {
                                enabled: true,
                                layout: 'horizontal',
                                align: 'center',
                                verticalAlign: 'bottom',
                                borderWidth: 1
                            },
                            series : seriesOptions
                        };

                        $('#' + $scope.itemid).highcharts('StockChart', highchart , function(chart) {

                            setTimeout(function() {
                                /* $('.highcharts-input-group')*/
                                $('.highcharts-input-group', $(chart.container).parent())
                                    .daterangepicker({
                                        format:format,
                                        startDate: moment(rangeTime.fromDate*1000).format(format),
                                        endDate: moment(rangeTime.toDate*1000).format(format),
                                        opens : 'left',
                                        maxDate : moment().toDate()
                                    })
                                    .on('apply',function(ev,picker){
                                        
                                        
                                        
                                        var min = picker.startDate;
                                        var max = picker.endDate;

                                        $scope.from = moment(min).format(format);
                                        $scope.to = moment(max).format(format);

                                        rawdata = undefined;

                                        var localFormat = "MMM D, YYYY";
                                        var tspans = $('.highcharts-input-group',$('#' + $scope.itemid)).find('tspan');
                                        $(tspans[1]).html(moment(min).format(localFormat)+" - "+moment(max).format(localFormat));
                                        
                                        

                                        chart.showLoading();
                                        $('.highcharts-loading span').html(
                                            "<div class='align-center'><img src='./img/ajax_loader_gray_350.gif' width='128' height='128'></div>");

                                        makeChart($scope.from, $scope.to);
                                    })
                                    .on('hide', function(ev,picker){
                                        chart.hideLoading();
                                    })
                                    .on('show', function(ev,picker){
                                        chart.showLoading();
                                    });

                            }, 0)
                        });
                    }
                    else if(charttype=='barcharts')
                    {
                        var durationsDictionaryBarcharts =
                            [{
                                type : 'hour',
                                count : 1,
                                text : 'h',
                                custom : 'deltahour'
                            }, {
                                type : 'day',
                                count : 1,
                                text : 'd',
                                custom: 'delta'
                            }];
                        var localFormat = "MMM D, YYYY";
                        var rangeTime = calculateTime($scope.from,$scope.to);
                        var startDate = moment(rangeTime.fromDate*1000).format(localFormat);
                        var endDate = moment(rangeTime.toDate*1000).format(localFormat);
                        var chartFormed;

                        function resetButtons(chart)
                        {
                            $.each(chart.rangeSelector.buttons, function(index, value) {
                                value.setState(0);
                                
                                
                                if(durationsDictionaryBarcharts[index].custom == $scope.args)
                                {
                                    value.setState(2);
                                }
                            });
                        }

                        var barchart ={
                            loading: {
                                style: {
                                    opacity: 0.8,
                                    backgroundColor: '#D3D3D3'
                                }
                            },
                            chart: {
                                alignTicks: false,
                                events: {
                                    load: function (event) {
                                        var zoomText = $('.highcharts-container',$('#' + $scope.itemid)).children('svg').children('text');
                                        var delta = zoomText[0];
                                        var highcharts = zoomText[2];
                                        if(zoomText.length==2)
                                        {
                                            $(zoomText[1]).html("");
                                        }
                                        else {
                                            $(zoomText[0]).html("Delta");
                                            $(zoomText[2]).html("");
                                        }
                                        $('.highcharts-input-group g:lt(2)',$('#' + $scope.itemid)).remove();
                                        $('.highcharts-input-group g:gt(0)',$('#' + $scope.itemid)).find('tspan').html(startDate+" - "+endDate);

                                        var chart = this,
                                            buttons = chart.rangeSelector.buttons;
                                        chartFormed = chart;

                                        resetButtons(chart);

                                        $.each(chart.rangeSelector.buttons, function(index, value) {
                                            value.on('click',function(e){
                                                var ignore = false;
                                                $.each(durationsDictionaryBarcharts, function(indexDuration, duration){
                                                    if(index==indexDuration)
                                                    {
                                                        
                                                        if($scope.from == 'start_day'&&  duration.custom == "delta")
                                                        {
                                                            ignore=true;
                                                            return;
                                                        }

                                                        chart.showLoading();
                                                        $('.highcharts-loading span').html(
                                                            "<div class='align-center'><img src='./img/ajax_loader_gray_350.gif' width='128' height='128'></div>");
                                                        rawdata = undefined;
                                                        $scope.args = duration.custom;
                                                        
                                                        
                                                        makeChart($scope.from,$scope.to);
                                                    }
                                                });
                                                if(!ignore)
                                                {
                                                    resetButtons();
                                                    value.setState(2);
                                                }
                                            });
                                        });

                                    }
                                }
                            },
                            legend: {
                                enabled : true
                            },
                            title: {
                                text: $scope.title
                            },
                            xAxis: {
                                type: 'datetime',
                                events: {
                                    afterSetExtremes : function(ev){
                                        
                                        var startDateLocal = moment(ev.userMin).format(localFormat);
                                        var endDateLocal = moment(ev.userMax).format(localFormat);
                                        $('.highcharts-input-group g:gt(0)',$('#' + $scope.itemid)).find('tspan').html(startDateLocal+" - "+endDateLocal);
                                    }
                                }
                            },
                            yAxis: {
                                title: {
                                    text: unit
                                },
                                labels: {
                                    format: '{value} '+unit
                                }
                            },
                            rangeSelector : {
                                buttons : durationsDictionaryBarcharts,
                                inputEnabled : true,
                                enabled:true,
                                updateButtonState : false
                            },
                            tooltip : {
                                shared : false,
                                formatter: function(ev) {
                                    
                                    
                                    var value = this.y;
                                    if((value%1)!= 0)
                                    {
                                        value = value.toFixed(2);
                                    }

                                    var todate = moment.utc(this.x);
                                    var fromdate = moment.utc(this.x).subtract('hour',1);
                                    var sameDay = false;
                                    if(todate.day()==fromdate.day())
                                    {
                                        sameDay=true;
                                    }
                                    if($scope.args=='delta'  || $scope.args=='peakday')
                                    {
                                        var formateddate = moment.utc(this.x).format('MMM D ddd YYYY');
                                        var s =  '<b>'+ formateddate +'</b>';
                                        s += '<br/><p style="color:'+this.series.color+'">'+ this.series.name +'</p>: '+value+' '+unit;
                                        return s;
                                    } else if($scope.args=='deltahour') {
                                        var format = 'MMM D ddd - HH:mm';
                                        var timeFormat = 'HH:mm';
                                        var formateddate;
                                        if(sameDay)
                                        {
                                            formateddate = fromdate.format(format)+' until '+todate.format(timeFormat);
                                        } else {
                                            formateddate = fromdate.format(format)+' until '+todate.format(format);
                                        }
                                        var s =  '<b>'+ formateddate +'</b>';
                                        s += '<br/><p style="color:'+this.series.color+'">'+ this.series.name +'</p>: '+value+' '+unit;
                                        return s;
                                    }
                                }
                            },
                            /* ,*/
                            series: seriesOptions
                        };

                        if($scope.stacked)
                        {
                            barchart.plotOptions = {
                                series: {
                                    stacking: 'normal'
                                }
                            }
                        }

                        $('#' + $scope.itemid).highcharts('StockChart',barchart , function(chart) {
                            
                            
                            
                            setTimeout(function() {
                                $('.highcharts-input-group', $(chart.container).parent())
                                    .daterangepicker({
                                        format:format,
                                        startDate: moment(rangeTime.fromDate*1000).format(format),
                                        endDate: moment(rangeTime.toDate*1000).format(format),
                                        opens : 'left',
                                        maxDate : moment().toDate()
                                    })
                                    .on('apply',function(ev,picker){
                                        
                                        
                                        
                                        var min = picker.startDate;
                                        var max = picker.endDate;

                                        $scope.from = moment(min).format(format);
                                        $scope.to = moment(max).format(format);

                                        rawdata = undefined;

                                        var localFormat = "MMM D, YYYY";
                                        var tspans = $('.highcharts-input-group', $('#' + $scope.itemid)).find('tspan');
                                        $(tspans[1]).html(moment(min).format(localFormat)+" - "+moment(max).format(localFormat));
                                        
                                        

                                        chart.showLoading();
                                        $('.highcharts-loading span').html(
                                            "<div class='align-center'><img src='./img/ajax_loader_gray_350.gif' width='128' height='128'></div>");

                                        makeChart($scope.from, $scope.to);
                                    })
                                    .on('hide', function(ev,picker){
                                        chart.hideLoading();
                                    })
                                    .on('show', function(ev,picker){
                                        chart.showLoading();
                                    });

                            }, 0)
                        });
                    }
                }
                var makeChart = function(fromS,toS) {

                    var calculated = calculateTime(fromS,toS);

                    if (rawdata) {
                        makeChartWith(rawdata);

                    } else {

                        var urlToCall = '/' + attr.persistence + 'servlet?fromDate=' + calculated.fromDate + '&toDate=' + calculated.toDate + '&items=' + itemIdsArr.join(",") +'&'+$scope.args;

                        $.ajax({
                            dataType : "json",
                            url : urlToCall,
                            //url: 'http://pleg.no-ip.org/'+attr.persistence+'servlet?fromDate='+calculated.fromDate+'&toDate='+calculated.toDate+'&items='+itemIdsArr.join(","),
                            success : function(data) {

                                rawdata = data;

                                //debugger;

                                $('#' + $scope.itemid).removeClass("hidden");

                                makeChartWith(rawdata);

                                $('#' + $scope.itemid+"-loading").addClass("hidden");

                            },
                            error : function(error) {
                                //debugger;
                            }
                        });
                    }
                }
                timer(function() {
                    makeChart($scope.from,$scope.to);
                }, 0);
            },
            controller : function($scope,$state){
                $scope.sitemap = $state.current.data.sitemap;
            }
        }
    }]);/**
 * Created by johngouf on 06/03/14.
 */
var mainContentDisplayer = angular.module('mainContentDisplayer',[]);

mainContentDisplayer.directive('plegmaMap', ['$timeout',
    function(timer)
    {
        return{
            templateUrl : "templates/plegmamap.html?"+millis,
            restrict : 'E',
            replace : true,
            scope : {
                id : "@",
                items : "@",
                title : "@"
            },
            link : function($scope, elem, attr) {

                var createMap = function()
                {
                    var map = L.map($scope.id+'-map').setView([51.505, -0.09], 13);

                    L.tileLayer('http://{s}.tile.cloudmade.com/57bf8d899b85438289ebc77b6ccd18a1/997/256/{z}/{x}/{y}.png', {
                        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
                        maxZoom: 18
                    }).addTo(map);

                    var locationsDict = [];
                    var itemArr = $scope.items.split("|");
                    $.each(itemArr,function(ind,item){
                        var splittedItem = item.split("[");
                        var itemId = splittedItem[0];
                        var latLng = JSON.parse("["+splittedItem[1]);
                        var exists = false;
                        $.each(locationsDict,function(ind,dictItem){
                           if(_.isEqual(dictItem.location,latLng))
                           {
                               exists = true;
                               dictItem.itemIds.push(itemId);
                               return;
                           }
                        });
                        if(!exists)
                        {
                            locationsDict.push({location : latLng, itemIds : [itemId]});
                        }
                    });

                    var valuesDict = {};
                    $.each(itemArr,function(ind,item){
                        var splittedItem = item.split("[");
                        var itemId = splittedItem[0];
                        var equals = getObjectsGenericWithValue($scope.sitemap,"name",itemId,{});
                        var value = "";
                        if(equals[0]&&equals[0].item)
                        {
                            value = equals[0].item.state;
                        } else {
                            value = "";
                        }
                        valuesDict[itemId]={value: value};
                        var initLabel = equals[0].label;

                        if(initLabel)
                        {
                            var scopeLabel = initLabel.split("[")[0];
                            valuesDict[itemId].label = scopeLabel;
                            var matches = initLabel.match(/\[(.*?)\]/);
                            if (matches) {
                                var submatch = matches[1];
                                var submatchArr = submatch.split(" ");
                                valuesDict[itemId].unit = submatchArr[1];
                            }
                        }
                        subscribeMap(itemId,valuesDict);
                    });

                    function onEachFeature(feature, layer) {
                        layer.on('click', function() {
                            var coordinates = this.feature.geometry.coordinates;
                            var items = this.feature.properties.items;
                            var loc = L.latLng(coordinates[1],coordinates[0]);
                            var popup = L.popup({
                                offset: L.point(0, -10)
                            })
                                .setLatLng(loc)
                                .setContent(getPopupContent(valuesDict,items))
                                .openOn(map);
                        });
                    }

                    var pointsOnMap = L.geoJson([], {
                        onEachFeature: onEachFeature
                      /*
                      pointToLayer: function (feature, latlng) {
                            return L.circleMarker(latlng, {
                                radius: 8,
                                fillColor: "RED",
                                color: "#000",
                                weight: 1,
                                opacity: 1,
                                fillOpacity: 0.8
                            });
                        }*/
                    }).addTo(map);

                    $.each(locationsDict,function(ind,locationItem){
                        var geoJSON = getGeojson(locationItem);
                        pointsOnMap.addData(geoJSON);
                    });
                    map.fitBounds(pointsOnMap.getBounds());
                }

                timer(function() {
                    createMap();
                }, 0);
            },
            controller : function($scope,$state){
                $scope.sitemap = $state.current.data.sitemap;
            }
        }
    }]);

function getGeojson(locationItem)
{
    var toRet =  {
        "type": "Feature",
        "properties": {
            items : locationItem.itemIds
        },
        "geometry": {
            "type": "Point",
            "coordinates": locationItem.location.reverse()
        }
    };
    return toRet;
}

function getPopupContent(valuesDict,items)
{
 var entries = [];
    $.each(items,function(ind,item){
        entries.push("<b>"+valuesDict[item].label+":</b> "+valuesDict[item].value+" "+valuesDict[item].unit);
    });
    return entries.join("</br>");
}

var socket = $.atmosphere;
var force_transport = 'websocket';
var fallbackProtocol = 'streaming';

function subscribeMap(itemId,valuesDict) {

    var location = "/rest/items/"+itemId;
    

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
        
        
    }
    request.onOpen = function(response) {
        //
        //
        detectedTransport = response.transport;
    }

    request.onMessage = function (response) {

        
        //

        if (response.status == 200) {
            var data = response.responseBody;
            if (data.length > 0) {
                try{
                    var value = JSON.parse(data).state;
                    valuesDict[itemId].value = value;
                } catch(e) {
                }
            }
        }
    };

    socket.subscribe(request);
}/**
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
                    
                    

                    charttype = getValueFromService($scope.widget.service,"charttype");
                    
                    

                    var range = getValueFromService($scope.widget.service,"range");
                    if(!range)
                    {
                        range="last_week|now";
                    }
                    var showselector = true;
                    if(range==="last_day|now") showselector = false;
                    

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
                    
                    
                    var allResults = (getObjectsGenericWithValue($scope.sitemap,"name",itemId,{}));
                    var parent;
                    $.each(allResults,function(i,result){
                        if(result.type=="Text")
                        {
                            parent = result;
                        }
                    });
                    
                    
                    /*                    debugger;*/

                    //var parent = (getObjectsGenericWithValue($scope.sitemap,"name",itemId,{}))[0];
                    
                    
                    
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
                
                

                //debugger;

                $scope.title = $scope.widget.label;
                $scope.itemid = $scope.widget.item.name;
                $scope.from = range.split("|")[0];
                $scope.to = range.split("|")[1];

                var rawdata;

                var makePiechart = function(){
                    $('#' + $scope.itemid).empty();

                    var piechartData = [];
                    

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
                            //
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
    }]);/**
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
                
                
                var equals = getObjectsGenericWithValue($scope.sitemap,"name",itemId,{});
                
                
                
                $scope.value = "";
                if(equals[0]&&equals[0].item)
                {
                    
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
    }]);/**
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
                    
                    
                    equals = getObjectsGenericWithValue($scope.sitemap,"name",itemId,{});
                    
                    
                    initLabel = equals[0].label;
                }

                $scope.itemid = itemId;

                
                

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
                        
                        
                    }
                }

                
                

                subscribe('/rest/sitemaps/'+$.cookie("tovisit")+"/"+$scope.state.name,$scope);
                subscriptionsFactory.subscriptions.push(itemId);

            },
            controller : function($scope,$state){
                $scope.sitemap = $state.current.data.sitemap;
                $scope.state = $state.current;
            }
        }
    }]);var App = function () {
	"use strict";

	var chartColors = ['#e5412d', '#f0ad4e', '#444', '#888','#555','#999','#bbb','#ccc','#eee'];
	
	return { init: init, chartColors: chartColors, debounce: debounce };

	function init () {
		initLayout ();	

		initICheck ();
		initSelect2 ();
		initTableCheckable ();
		
		initLightbox ();
		initEnhancedAccordion ();
		initDataTableHelper ();

		initFormValidation ();
		initTooltips ();
		initDatepicker ();
		initTimepicker ();
		initColorpicker ();
		initAutosize ();

		initBackToTop ();
	}

	function initLayout () {
		$('#site-logo').prependTo ('#wrapper');
		$('html').removeClass ('no-js');
		
		//Nav.init ();

		$('body').on('touchstart.dropdown', '.dropdown-menu', function (e) { 
		    e.stopPropagation(); 
		});
	}

	function initTableCheckable () {
		if ($.fn.tableCheckable) {
			$('.table-checkable')
		        .tableCheckable ()
			        .on ('masterChecked', function (event, master, slaves) { 
			            if ($.fn.iCheck) { $(slaves).iCheck ('update'); }
			        })
			        .on ('slaveChecked', function (event, master, slave) {
			            if ($.fn.iCheck) { $(master).iCheck ('update'); }
			        });
		}
	}

	function initAutosize () {
		if ($.fn.autosize) {
		$('.ui-textarea-autosize').each(function() {
			if($(this).data ('animate')) {
					$(this).addClass ('autosize-animate').autosize();
				} else {
					$(this).autosize();
				}
			});
		}
	}

	function initEnhancedAccordion () {
		$('.accordion .accordion-toggle').on('click', function (e) {			
	         $(e.target).parent ().parent ().parent ().addClass('open');
	    });
	
	    $('.accordion .accordion-toggle').on('click', function (e) {
	        $(this).parents ('.panel').siblings ().removeClass ('open');
	    });

	    $('.accordion').each (function () {	    	
	    	$(this).find ('.panel-collapse.in').parent ().addClass ('open');
	    });	    
	}

	function initFormValidation () {
		if ($.fn.parsley) {
			$('.parsley-form').each (function () {
				
				$(this).parsley ({
					trigger: 'change',
					errors: {
						container: function (element, isRadioOrCheckbox) {
							if (element.parents ('form').is ('.form-horizontal')) {
								return element.parents ("*[class^='col-']");
							}

							return element.parents ('.form-group');
						}
					}
				});
			});
		}
	}

	function initLightbox () {
		if ($.fn.magnificPopup) {
			$('.ui-lightbox').magnificPopup({
				type: 'image',
				closeOnContentClick: false,
				closeBtnInside: true,
				fixedContentPos: true,
				mainClass: 'mfp-no-margins mfp-with-zoom', // class to remove default margin from left and right side
				image: {
					verticalFit: true,
					tError: '<a href="%url%">The image #%curr%</a> could not be loaded.'
				}
			});

			$('.ui-lightbox-video, .ui-lightbox-iframe').magnificPopup({
				disableOn: 700,
				type: 'iframe',
				mainClass: 'mfp-fade',
				removalDelay: 160,
				preloader: false,
				fixedContentPos: false
			});

			$('.ui-lightbox-gallery').magnificPopup({
				delegate: 'a',
				type: 'image',
				tLoading: 'Loading image #%curr%...',
				mainClass: 'mfp-img-mobile',
				gallery: {
					enabled: true,
					navigateByImgClick: true,
					preload: [0,1] // Will preload 0 - before current, and 1 after the current image
				},
				image: {
					tError: '<a href="%url%">The image #%curr%</a> could not be loaded.',
					titleSrc: function(item) {
						return item.el.attr('title') + '<small>by Marsel Van Oosten</small>';
					}
				}
			});
		}
	}

	function initSelect2 () {
		if ($.fn.select2) {
			$('.ui-select2').select2({ allowClear: true, placeholder: "Select..." });
		}
	}

	function initDatepicker () {
		if ($.fn.datepicker) { $('.ui-datepicker').datepicker ({ autoclose: true }); }
	}

	function initTimepicker () {
		if ($.fn.timepicker) { 
			var pickers = $('.ui-timepicker, .ui-timepicker-modal');

			pickers.each (function () {
				$(this).parent ('.input-group').addClass ('bootstrap-timepicker');

				if ($(this).is ('.ui-timepicker')) {
					$(this).timepicker ();
				} else {
					$(this).timepicker({ template: 'modal' });
				}	
			});		
		}
	}

	function initColorpicker () {
		if ($.fn.simplecolorpicker) {
			$('.ui-colorpicker').each (function (i) {
				var picker = $(this).data ('picker');

				$(this).simplecolorpicker({ 
					picker: picker
				});
			});
		}
	}

	function initTooltips () {
		if ($.fn.tooltip) { $('.ui-tooltip').tooltip (); }
		if ($.fn.popover) { $('.ui-popover').popover ({ container: 'body' }); }
	}

	function initICheck () {
		if ($.fn.iCheck) {
			$('.icheck-input').iCheck({
				checkboxClass: 'icheckbox_minimal-blue',
				radioClass: 'iradio_minimal-blue',
				inheritClass: true
			}).on ('ifChanged', function (e) {
				$(e.currentTarget).trigger ('change');
			});
		}
	}

	function initBackToTop () {
		var backToTop = $('<a>', { id: 'back-to-top', href: '#top' });
		var icon = $('<i>', { class: 'fa fa-chevron-up' });

		backToTop.appendTo ('body');
		icon.appendTo (backToTop);
		
	    backToTop.hide();

	    $(window).scroll(function () {
	        if ($(this).scrollTop() > 150) {
	            backToTop.fadeIn ();
	        } else {
	            backToTop.fadeOut ();
	        }
	    });

	    backToTop.click (function (e) {
	    	e.preventDefault ();

	        $('body, html').animate({
	            scrollTop: 0
	        }, 600);
	    });
	}

	function initDataTableHelper () {
		if ($.fn.dataTable) {
			$('[data-provide="datatable"]').each (function () {	
				$(this).addClass ('dataTable-helper');		
				var defaultOptions = {
						paginate: false,
						search: false,
						info: false,
						lengthChange: false,
						displayRows: 10
					},
					dataOptions = $(this).data (),
					helperOptions = $.extend (defaultOptions, dataOptions),
					$thisTable,
					tableConfig = {};

				tableConfig.iDisplayLength = helperOptions.displayRows;
				tableConfig.bFilter = true;
				tableConfig.bSort = true;
				tableConfig.bPaginate = false;
				tableConfig.bLengthChange = false;	
				tableConfig.bInfo = false;

				if (helperOptions.paginate) { tableConfig.bPaginate = true; }
				if (helperOptions.lengthChange) { tableConfig.bLengthChange = true; }
				if (helperOptions.info) { tableConfig.bInfo = true; }       
				if (helperOptions.search) { $(this).parent ().removeClass ('datatable-hidesearch'); }				

				tableConfig.aaSorting = [];
				tableConfig.aoColumns = [];

				$(this).find ('thead tr th').each (function (index, value) {
					var sortable = ($(this).data ('sortable') === true) ? true : false;
					tableConfig.aoColumns.push ({ 'bSortable': sortable });

					if ($(this).data ('direction')) {
						tableConfig.aaSorting.push ([index, $(this).data ('direction')]);
					}
				});		
				
				// Create the datatable
				$thisTable = $(this).dataTable (tableConfig);

				if (!helperOptions.search) {
					$thisTable.parent ().find ('.dataTables_filter').remove ();
				}

				var filterableCols = $thisTable.find ('thead th').filter ('[data-filterable="true"]');

				if (filterableCols.length > 0) {
					var columns = $thisTable.fnSettings().aoColumns,
						$row, th, $col, showFilter;

					$row = $('<tr>', { cls: 'dataTable-filter-row' }).appendTo ($thisTable.find ('thead'));

					for (var i=0; i<columns.length; i++) {
						$col = $(columns[i].nTh.outerHTML);
						showFilter = ($col.data ('filterable') === true) ? 'show' : 'hide';

						th = '<th class="' + $col.prop ('class') + '">';
						th += '<input type="text" class="form-control input-sm ' + showFilter + '" placeholder="' + $col.text () + '">';
						th += '</th>';
						$row.append (th);
					}

					$row.find ('th').removeClass ('sorting sorting_disabled sorting_asc sorting_desc sorting_asc_disabled sorting_desc_disabled');

					$thisTable.find ('thead input').keyup( function () {
						$thisTable.fnFilter( this.value, $thisTable.oApi._fnVisibleToColumnIndex( 
							$thisTable.fnSettings(), $thisTable.find ('thead input[type=text]').index(this) ) );
					});

					$thisTable.addClass ('datatable-columnfilter');
				}
			});

			$('.dataTables_filter input').prop ('placeholder', 'Search...');
		}
	}

	function debounce (func, wait, immediate) {
		var timeout, args, context, timestamp, result;
		return function() {
			context = this;
			args = arguments;
			timestamp = new Date();

			var later = function() {
				var last = (new Date()) - timestamp;

				if (last < wait) {
					timeout = setTimeout(later, wait - last);
				} else {
					timeout = null;
					if (!immediate) result = func.apply(context, args);
				}
			};

			var callNow = immediate && !timeout;

			if (!timeout) {
				timeout = setTimeout(later, wait);
			}

			if (callNow) result = func.apply(context, args);
			return result;
		};
	}
}();

var Nav = function () {
	
	return { init: init };
	
	function init () {
		var mainnav = $('#main-nav'),
			openActive = mainnav.is ('.open-active'),
			navActive = mainnav.find ('> .active');

		mainnav.find ('> .dropdown > a').bind ('click', navClick);

        


		if (openActive && navActive.is ('.dropdown')) {			
			navActive.addClass ('opened').find ('.sub-nav').show ();
		}
	}
	
	function navClick (e) {
		e.preventDefault ();
		
		var li = $(this).parents ('li');		
		
		if (li.is ('.opened')) { 
			closeAll ();			
		} else { 
			closeAll ();
			li.addClass ('opened').find ('.sub-nav').slideDown ();			
		}
	}
	
	function closeAll () {	
		$('.sub-nav').slideUp ().parents ('li').removeClass ('opened');
	}
}();

$(function () {
	App.init ();
});var Login = function () {
	"use strict";
	
	return { init: init };

	function init () {
		$.support.placeholder = false;
		var test = document.createElement('input');
		if('placeholder' in test) $.support.placeholder = true;
		
		if (!$.support.placeholder) {
			$('#login-form').find ('label').show ();			
		}
	}
} ();

$(function () {

	Login.init ();
	
});/**
 * Created by johngouf on 24/11/13.
 */
//var plegmaApp = angular.module("plegmaApp", ['loginModule','routeNavBuilder','mainContentDisplayer']);
var plegmaApp = angular.module("plegmaApp", ['routeNavBuilder','mainContentDisplayer']);

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

});/**
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
                
                
                //debugger;

                if(widget.service)
                {
                    
                    var charttype = getValueFromService(widget.service,"charttype");
                    
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
        else {}
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
                        /* 
                         $scope.widgetFragments[$scope.widgetFragments.length-1].push({type:type,widget:widget});*/
                    }
                }
            }
        }
    });

    
    //debugger;
    widgetsToShow = widgetHighcharts.length+widgetMorris.length+ widgetTexts.length + widgetsWebviews.length + widgetsImages.length + widgetsRRD4J.length;

    $scope.rowsHighcharts = chunk(widgetHighcharts, 1);
    $scope.rowsMorris = chunk(widgetMorris, 1);
    $scope.rowsWebviews = chunk(widgetsWebviews, 1);
    $scope.rowsTexts = chunk(widgetTexts, 3);
    $scope.rowsImages = chunk(widgetsImages, 1);
    $scope.rowsRRD4J = chunk(widgetsRRD4J,1);

    

    //debugger;

    if(widgetsToShow==0&&$scope.children)
    {
        $scope.showLinks = true;

        
        
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
    
});
/**
 * Created by johngouf on 27/11/13.
 */
var routeNavBuilder = angular.module("routeNavBuilder", ['ui.router']);

var millis = ((new Date()).getTime());

var regex = /^\d+$/

routeNavBuilder.run(
    [        '$rootScope', '$state', '$stateParams',
        function ($rootScope,   $state,   $stateParams) {

            $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
                if(fromState.name.length==0)
                {
                    $('body').removeClass("cleanbody");
                    $("#wrapper").removeClass("hidden");
                    $("#login-container").addClass("hidden");
                    $("#footer").removeClass("hidden");

                }
            });

            // It's very handy to add references to $state and $stateParams to the $rootScope
            // so that you can access them from any scope within your applications.For example,
            // <li ng-class="{ active: $state.includes('contacts.list') }"> will set the <li>
            // to active whenever 'contacts.list' or one of its decendents is active.
            $rootScope.$state = $state;
            $rootScope.$stateParams = $stateParams;
        }]);

var hashed = $.cookie("hashed");

if(hashed)
{
    $.ajaxSetup({
        beforeSend: function (jqXHR, settings) {
            jqXHR.setRequestHeader('Authorization', 'Basic ' + hashed);
            return true;
        }
    });
}

var loginState = {
    name : "login",
    url: "/login",
    views: {
        fullscreen:{
            templateUrl: "templates/customcontent/page-login.html?"+millis
        }
    }
};

var json;

var sitemapName;

var currenturl = (window.location.hash);
if(currenturl!='#/login')
{
    var arr = (currenturl.split("/"));
    if(arr.length > 1)
    {
        sitemapName = arr[1];
        $.cookie("tovisit",sitemapName);
    }
}

$.ajax({
    url:'/rest/sitemaps/'+$.cookie("tovisit"),
    //url:'http://pleg.no-ip.org/rest/sitemaps/demo',
    success: function(result) {
        json = result;
        createAuthorizedStates(json);
    },
    error: function(result) {
        createUnauthorizedStates();
    },
    dataType: "JSON",
    async: false
});

function createUnauthorizedStates(){
    routeNavBuilder.config(function ($stateProvider, $urlRouterProvider) {
        $stateProvider.state(loginState);
        $urlRouterProvider.otherwise("/login");
    });
}

function createAuthorizedStates(inputJson)
{
    
    
    routeNavBuilder.config(function ($stateProvider, $urlRouterProvider, $httpProvider) {

        $httpProvider.defaults.headers.common['Authorization'] = 'Basic ' + hashed;

        

        $urlRouterProvider.rule(function($injector, $location) {
            var path = $location.path(), search = $location.search();
            if (path[path.length-1] !== '/') {
                if (search === {}) {
                    return path + '/';
                } else {
                    var params = [];
                    angular.forEach(search, function(v, k){
                        params.push(k + '=' + v);
                    });
                    return path + '/?' + params.join('&');
                }
            }
        });

        $urlRouterProvider.when("", "/"+$.cookie("tovisit")+"/");

        $urlRouterProvider.otherwise("/"+$.cookie("tovisit")+"/");

        var home = {
            name : "home",
            url : "/"+$.cookie("tovisit")+"/",
            views : {
                'navigation' : {
                    templateUrl:'templates/plegmanav.html?'+millis,
                    controller : function($scope,$state)
                    {
                        $scope.treeFamily = $state.current.data.treeFamily;


                    }
                },'content' : {
                    templateProvider: function ($http) {
                        return $http.get("templates/customcontent/home.html?"+millis).then(
                            //on success
                            function(result){return result.data},
                            //on error
                            function(){return $http.get("templates/plegmacontent.html?"+millis).then(
                                function(result){return result.data}
                            )}
                        );
                    },
                    controller : {}
                }
            },
            data : {
                treeFamily :  {},
                sitemap : {}
            }
        };

        var testVar = inputJson;
        var tree = getTreeStructure(inputJson);

        home.data.treeFamily={children : tree};
        home.data.sitemap = inputJson;
        home.data.user = $.cookie("user");
        home.data.label = inputJson.label;
        document.title = inputJson.label;

        
        
        var res = getObjects(tree,"link",{});
        res.sort(function(a, b){
            return a.level - b.level; // ASC -> a - b; DESC -> b - a
        });
        
        

        var children = {};
        for(var i = 0 ; i < res.length; i++ )
        {
            var item = res[i].item;
            if(!item.father)
            {
                item.father = "home";
            }
            if(children[item.father])
            {
                children[item.father].push(item);
            } else {
                children[item.father]=[item];
            }
        }
        
        

        home.views.content.controller = function($scope,$state)
        {
            $scope.title = "Home";
            $scope.children = children["home"];
            $scope.widgets = tree;
        };

        var states = {};

        for(var parentkey in children)
        {
            var parentsChildren = children[parentkey];
            for(var a = 0 ; a < parentsChildren.length; a++)
            {
                var parentChildren = parentsChildren[a];
                var prettyurl = parentChildren.label.toLowerCase().replace(/ /g,"_");
                var state = getState(parentChildren.link,parentkey,parentChildren.id,prettyurl,children[parentChildren.id]);
                states[parentChildren.id]=state;
            }
        }

        $stateProvider.state(home);

        for(var stateKey in states)
        {
            $stateProvider.state(states[stateKey]);
        }

        
        
    });
}

routeNavBuilder.factory('RecursionHelper', ['$compile', function($compile){
    var RecursionHelper = {
        compile: function(element){
            var contents = element.contents().remove();
            var compiledContents;
            return function(scope, element){
                if(!compiledContents){
                    compiledContents = $compile(contents);
                }
                compiledContents(scope, function(clone){
                    element.append(clone);
                });
            };
        }
    };

    return RecursionHelper;
}]);

routeNavBuilder.directive("tree", function(RecursionHelper) {
    return {
        restrict: "E",
        scope: {family: '='},
        templateUrl:'templates/plegmanavitem.html?'+millis,
        compile: function(element) {
            return RecursionHelper.compile(element);
        }
    };
});

routeNavBuilder.controller('dropdownCtrl', function($scope,$state, $element) {
    $scope.showForm = false;
    $scope.isActive = false;

    if($state.includes($scope.child.id)){
        if($scope.child.children.length>0)
          $scope.showForm = true;
    }
    if($state.current.name === $scope.child.id)
    {
        $scope.isActive = true;
    }
    

    $scope.$on('$stateChangeSuccess',
        function(event, toState, toParams, fromState, fromParams){

            if(toState.name.substring(0,$scope.child.id.length)==$scope.child.id){
                if($scope.child.children.length>0)
                    $scope.showForm = true;
                else $scope.showForm = false;
            }
            else $scope.showForm = false;

            if(toState.name === $scope.child.id)
            {
                $scope.isActive = true;
            } else {
                $scope.isActive = false;
            }
        });
    $scope.child.class = ['fa','fa-5x'];
    if($scope.child.icon&&$scope.child.icon!="none"&&$scope.child.icon!="")
    {
        $scope.child.class.push("fa-"+$scope.child.icon);
    }

    $scope.slideCheck = function(child) {
        $state.go(child.id);
        
    };
//TODO: when there is a state transition on click of a parent handle it properly
    $scope.collapseAllCheck = function() {
        if($("#sidebar-toggle").is(":visible"))
        {
            $("#sidebar-toggle").click();
        }
    }
});

routeNavBuilder.directive('showSlide', function() {
    return {
        //restrict it's use to attribute only.
        restrict : 'A',
        //set up the directive.
        link : function(scope, elem, attr) {

            //get the field to watch from the directive attribute.
            var watchField = attr.showSlide;

            //set up the watch to toggle the element.
            scope.$watch(attr.showSlide, function(v) {

                //
                //
                if (v == true && !elem.is(':visible')) {
                    elem.slideDown();
                } else {
                    elem.slideUp();
                }
            });
        }
    }
});

function getState(link,parent,levelurl,prettyurl,children)
{
    
    return {
        name : levelurl,
        url : prettyurl+"/",
        resolve : {
            getContent :function($http){
                // $http returns a promise for the url data
                return $http({method: 'GET', url: link});
            }
        },
        parent : parent,
        views : {
            'content@' : {
                templateProvider: function ($http) {
                    return $http.get("templates/customcontent/"+prettyurl+".html?"+millis).then(
                        //on success
                        function(result){return result.data},
                        //on error
                        function(){return $http.get("templates/plegmacontent.html?"+millis).then(
                            function(result){return result.data}
                        )}
                    );
                },
                controller : function($scope,$state,getContent)
                {
                    
                    var atmoid = (getContent.headers()["x-atmosphere-tracking-id"]);
                    //
                    var data = getContent.data;
                    $scope.title = data.title;
                    var widgets = getObjectsGeneric(data,"widgetId",{});
                    $.each(widgets,function(i,widget){
                        widgets[i].atmoid = atmoid;
                    });
                    $scope.widgets = widgets;
                    $scope.children = children;
                //    $scope.class = ['fa','fa-5x'];
     /*               
                    }*/
                    //
                    
                    
                    
                    
                }
            }
        }
    };
}

function getObjects(obj, key, parent) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getObjects(obj[i], key, obj));
        } else if (i == key) {
            var arr = (obj.link.split("/"));
            var last = (arr[arr.length-1]);

            if(regex.test(last)){
                var id = (regex.exec(last))[0];
                var length = id.length;
                objects.push({item: obj, level : length, id : id});
            }

        }
    }
    return objects;
}

function getTreeStructure(inputjson)
{
    var res = getObjects(inputjson,"link",{});
    res.sort(function(a, b){
        return a.level - b.level; // ASC -> a - b; DESC -> b - a
    });

    var level = 0;
    var levels = [];
    var buffer = [];
    for(var i = 0; i < res.length; i++)
    {
        if(level == 0)
        {
            level = res[i].level;
        }
        if(level==res[i].level)
        {
            buffer.push({label : res[i].item.title,link: res[i].item.link, id : res[i].item.id , children : [], icon : res[i].item.icon});
        } else {
            sortWithId(buffer);
            levels.push(buffer);
            buffer = [];
            buffer.push({label : res[i].item.title,link: res[i].item.link, id : res[i].item.id , children : [], icon : res[i].item.icon});
            level = res[i].level;
        }
    }
    sortWithId(buffer);
    levels.push(buffer);

    for(var l = levels.length-1 ; l > 0 ; l--)
    {
        for(var l1 = l-1; l1 >= 0; l1 --)
        {
            var parents = levels[l1];
            var children = levels[l];
            var found = false;
            for(var p = 0; p< parents.length ; p++)
            {
                for (var c = 0; c < children.length; c++) {
                    if(children[c].foundfather == true)
                    {
                        continue;
                    }
                    if(children[c].id.indexOf(parents[p].id)==0)
                    {
                        parents[p].children.push(children[c]);
                        children[c].father = parents[p].id;
                        children[c].foundfather = true;
                    }
                }
            }
        }
    }
    return(levels[0]);
}

function sortWithId(arr)
{
    arr.sort(function(a, b){
        return parseInt(a.id) - parseInt(b.id); // ASC -> a - b; DESC -> b - a
    });
}

function getObjectsGeneric(obj, key, parent) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getObjectsGeneric(obj[i], key, obj));
        } else if (i == key) {
            objects.push(obj);
        }
    }
    return objects;
}

function getObjectsGenericWithValue(obj, key, value, parent) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getObjectsGenericWithValue(obj[i], key, value, obj));
        } else if ((i == key) && (obj[i] == value)) {
            objects.push(parent);
        }
    }
    return objects;
}


