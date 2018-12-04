
angular
.module('SocialCartographyApp')
.config(['$routeProvider',
  function config($routeProvider){
    $routeProvider
      .when('/', {
        template: `<introduction></introduction>`
      })
      .when('/introduction', {
        template: '<introduction></introduction>'
      })
      .when('/timeline', {
        template: '<timeline></timeline>',
      })
      .otherwise('/introduction');
  }]);
