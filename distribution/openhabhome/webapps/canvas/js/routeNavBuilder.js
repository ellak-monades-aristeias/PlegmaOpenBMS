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
    console.log("someone called me");
    console.log(inputJson);
    routeNavBuilder.config(function ($stateProvider, $urlRouterProvider, $httpProvider) {

        $httpProvider.defaults.headers.common['Authorization'] = 'Basic ' + hashed;

        console.log("someone called me config");

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

        console.log("tree");
        console.log(tree);
        var res = getObjects(tree,"link",{});
        res.sort(function(a, b){
            return a.level - b.level; // ASC -> a - b; DESC -> b - a
        });
        console.log("getObjects");
        console.log(res);

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
        console.log("children");
        console.log(children);

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

        console.log("states");
        console.log(states);
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
    console.log($state.current.name, $scope.child.id);

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
        console.log('clicked');
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

                //console.log(attr);
                //console.log(v,elem);
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
    console.log(link);
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
                    console.log("headers");
                    var atmoid = (getContent.headers()["x-atmosphere-tracking-id"]);
                    //console.log($scope.atmoid);
                    var data = getContent.data;
                    $scope.title = data.title;
                    var widgets = getObjectsGeneric(data,"widgetId",{});
                    $.each(widgets,function(i,widget){
                        widgets[i].atmoid = atmoid;
                    });
                    $scope.widgets = widgets;
                    $scope.children = children;
                //    $scope.class = ['fa','fa-5x'];
     /*               console.log("icon is")
                    if($scope.icon&&$scope.icon!="none"&&$scope.icon!="")
                    {
                        $scope.class.push("fa-"+$scope.icon);
                    }*/
                    //console.log($scope.class);
                    console.log("inputdata");
                    console.log(data);
                    console.log("widgets");
                    console.log(widgets);
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


