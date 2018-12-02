angular
  .module('Introduction', [])
  .component('introduction', {
    templateUrl: 'components/introduction/intro.t.html',
    controller: ['$scope', function IntroductionCtrl($scope){
      $scope.date = moment().format('MMMM Do YYYY, H:mm:ss');

      function repeat(){
        $scope.date = moment().format('MMMM Do YYYY, H:mm:ss');
        requestAnimationFrame(repeat);
      };
    }]});