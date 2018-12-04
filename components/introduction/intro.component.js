angular
  .module('Introduction', [])
  .component('introduction', {
    templateUrl: 'components/introduction/intro.t.html',
    controller: ['$scope', function IntroductionCtrl($scope){
    }]});