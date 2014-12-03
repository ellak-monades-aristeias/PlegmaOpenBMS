/**
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
                    console.log($scope.stacked);

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
                                    console.log("for "+$scope.widget.service);
                                    console.log(moment.utc(data[itemIdsArr[i1]][i][0],webserviceFormat).toDate());
                                }
                                // console.log('the data is '+data[itemIdsArr[i1]][i][0]);
                                localdata.push(moment.utc(data[itemIdsArr[i1]][i][0],webserviceFormat).unix() * 1000);
                                localdata.push(data[itemIdsArr[i1]][i][1]);
                                itemdata.push(localdata);
                            }
                            console.log(itemIdsLabelDictionary);
                            console.log(itemIdsArr[i1]);
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
                        console.log(seriesOptions);
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
                                    console.log(this.x);
                                    console.log(this.points);
                                    console.log(this.points[0].series);
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
                                    console.log(s);
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
                                        console.log("changeDate");
                                        console.log(picker.startDate.format('YYYY-MM-DD'));
                                        console.log(picker.endDate.format('YYYY-MM-DD'));
                                        var min = picker.startDate;
                                        var max = picker.endDate;

                                        $scope.from = moment(min).format(format);
                                        $scope.to = moment(max).format(format);

                                        rawdata = undefined;

                                        var localFormat = "MMM D, YYYY";
                                        var tspans = $('.highcharts-input-group',$('#' + $scope.itemid)).find('tspan');
                                        $(tspans[1]).html(moment(min).format(localFormat)+" - "+moment(max).format(localFormat));
                                        console.log($scope.from);
                                        console.log($scope.to);

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
                                console.log(durationsDictionaryBarcharts[index].custom);
                                console.log($scope.args);
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
                                                        console.log('you selected: '+JSON.stringify(duration));
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
                                                        console.log($scope.from);
                                                        console.log($scope.to);
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
                                        console.log(ev);
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
                                    console.log(this);
                                    console.log(ev);
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
                            console.log('this is the chart!');
                            console.log(chart);
                            console.log($('input.highcharts-range-selector', $('#' + $scope.itemid)));
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
                                        console.log("changeDate");
                                        console.log(picker.startDate.format('YYYY-MM-DD'));
                                        console.log(picker.endDate.format('YYYY-MM-DD'));
                                        var min = picker.startDate;
                                        var max = picker.endDate;

                                        $scope.from = moment(min).format(format);
                                        $scope.to = moment(max).format(format);

                                        rawdata = undefined;

                                        var localFormat = "MMM D, YYYY";
                                        var tspans = $('.highcharts-input-group', $('#' + $scope.itemid)).find('tspan');
                                        $(tspans[1]).html(moment(min).format(localFormat)+" - "+moment(max).format(localFormat));
                                        console.log($scope.from);
                                        console.log($scope.to);

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
    }]);