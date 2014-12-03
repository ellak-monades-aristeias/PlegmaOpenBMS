/**
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
                    valuesDict[itemId].value = value;
                } catch(e) {
                }
            }
        }
    };

    socket.subscribe(request);
}