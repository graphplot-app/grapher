angular
.module('SocialCartographyApp')
.controller('IndexCtrl', ['$scope', '$rootScope', function($scope, $rootScope){
  $rootScope.persons = new Set();
  $rootScope.show_person = false;

  $rootScope.add_person = function(){
    $rootScope.persons.add({
      'name': $rootScope.name,
      'date_of_birth': $rootScope.date_of_birth,
      'date_of_death': $rootScope.date_of_death
    });

    $scope.name = null;
    $scope.date_of_birth = null;
    $scope.date_of_death = null;

    $rootScope.show_person = false;
  }
}]);