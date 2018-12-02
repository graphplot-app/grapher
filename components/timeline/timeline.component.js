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
          content: 'Hello, Worlds!',
          start: '2018-12-01',
          end: '2018-12-02'
        }
      ];

      this.data = new vis.DataSet(events);
      this.add = () => {
        this.data.add({
          'content': $scope.title,
          'start': $scope.start,
          'end': $scope.end
        });

        $scope.title = '';
        $scope.start = null;
        $scope.end = null;

        console.log('done')
      };

      timeline = new vis.Timeline(document.querySelector('#timeline-container'), this.data, {
        /*
        maxHeight: 300,
        minHeight: 300,
        zoomable: false,
        horizontalScroll: true,
        start: new Date((new Date()).valueOf() - 1000*60*60*3),
        end: new Date(1000*60*60*24 + (new Date()).valueOf())
        */
      });
    }]});