angular
  .module('Timeline', [])
  .component('timeline', {
    templateUrl: 'components/timeline/timeline.t.html',
    controller: ['$scope', function TimelineCtrl($scope){
      function repeat(){
        $scope.date = new Date();
        window.requestAnimationFrame(repeat);
      }

      repeat();

      var events = [
        {
          title: 'Hello, Worlds!',
          start: moment('2018-12-01'),
          end: moment('2018-12-02')
        }
      ];

      timeline = new vis.Timeline(document.querySelector('#timeline-container'), new vis.DataSet(events), {
        maxHeight: 300,
        minHeight: 300,
        zoomable: false,
        horizontalScroll: true,
        start: new Date((new Date()).valueOf() - 1000*60*60*3),
        end: new Date(1000*60*60*24 + (new Date()).valueOf())
      });
    }]});