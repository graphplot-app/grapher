angular
  .module('Timeline', [])
  .component('timeline', {
    templateUrl: 'components/timeline/timeline.t.html',
    controller: ['$scope', function TimelineCtrl($scope){

      $('#display').fourd({width: 1000, height: 500, background: 0xffffff});
      this.fourd = $('#display').fourd('underlying_object');

      $scope.events = [];

      this.data_set = new vis.DataSet($scope.events);
      this.data = this.data_set.get();
      this.add = () => {

        var obj = {
          'start': $scope.date,
          'content': $scope.content
        };
        this.data_set.add(obj);
        obj.vertex = this.fourd.graph.add_vertex({cube: {
          size: 10,
          color: 0x0000000
        }, label: {text: $scope.event}});

        this.data = this.data_set.get();
      };

      this.timeline = new vis.Timeline(document.querySelector('#timeline-container'), this.data, {type: 'point'});
    }]});