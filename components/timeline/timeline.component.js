angular
  .module('Timeline', [])
  .component('timeline', {
    templateUrl: 'components/timeline/timeline.t.html',
    controller: ['$scope', function TimelineCtrl($scope){
      $('#display').fourd({
        'width': () => window.innerWidth-40, 
        'height': () => window.innerHeight-40, 
        'background': null,
        'resize': true
      });
      this.fourd = $('#display').fourd('underlying_object');
      
      this.dataset = new vis.DataSet();
      this.dataset.add({
        start: new Date(),
        content: 'Hello, Worlds!'
      });
      $scope.events = this.dataset.get();

      this.parse = () => {
        var doc = nlp($scope.event);
        doc.sentences().map(s => {
          var d = nlp(s);
          d.people().map(p => {
            fourd.graph.add_vertex({cube: {size: 10, color: 0x000000}, label: {text: $scope.event}});
          });
        });
      };

      this.add = () => {
        this.parse();
        var obj = {
          'start': new Date(),
          'content': $scope.event
        };
        this.dataset.add(obj)
        obj.vertex = this.fourd.graph.add_vertex({
          cube: {
            size: 10,
            color: 0x0000000
          }, 
          label: {
            text: $scope.event
          }
        });
        obj.vertex.timeline_obj = obj;

        $scope.events = this.dataset.get();
      };

      this.timeline = new vis.Timeline(
        document.querySelector('#timeline-container'), 
        this.dataset, 
        {type: 'point'}
      );

      this.timeline.on('rangechanged', function(event){

      });
    }]});