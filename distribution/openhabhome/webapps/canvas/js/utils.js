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
    console.log(propertiesArr);
    _.each(propertiesArr,function(property){
        console.log("the property is");
        console.log(property.split("=")[0]);
        console.log("I am looking for");
        console.log(value);
        console.log("testing");
        console.log(property.split("=")[0]==value);
        if(property.split("=")[0]==value) {
            console.log(property.split("=")[1]);
            toRet = property.split("=")[1];
        }
    });
    return toRet;
}

var socket = $.atmosphere;
var force_transport = 'websocket';
var fallbackProtocol = 'streaming';

function subscribe(location,$scope,chart) {

    console.log("subscribed="+location);
    console.log(location,$scope,chart);

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
                    console.log("message="+JSON.parse(data));
                    //debugger;
                    console.log("message is "+data);
                    console.log('$scope.itemId');
                    console.log($scope.itemid);
                    console.log(JSON.parse(data));
                    var equals = getObjectsGenericWithValue(JSON.parse(data),"name",$scope.itemid,{});
                    console.log("equals");
                    console.log(equals);
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
                        console.log("submatch");
                        console.log(submatch);
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
}