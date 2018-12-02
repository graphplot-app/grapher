
angular
.module('SocialCartographyApp')
.config(['$routeProvider',
  function config($routeProvider){
    $routeProvider
      .when('/', {
        template: `<intro></intro>`
      })
      .when('/introduction', {
        template: '<introduction></introduction>'
      })
      .when('/timeline', {
        template: '<timeline></timeline>',
      })
      /*
      .when('/graph', {
        template: '<social-cartography></social-cartography>'
      })
      */
      .otherwise('/intro');
  }]);
