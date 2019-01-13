angular
  .module('SocialCartography')
  .component('life', {
    templateUrl: 'components/life/life.t.html',
    controller: ['$scope', function LifeCtrl($scope){
      /*
        Any live cell with fewer than two live neighbors dies, as if by underpopulation.
        Any live cell with two or three live neighbors lives on to the next generation.
        Any live cell with more than three live neighbors dies, as if by overpopulation.
        Any dead cell with exactly three live neighbors becomes a live cell, as if by reproduction.
      */
      $('#display').fourd({
        'width': window.innerWidth, 
        'height': window.innerHeight, 
        'background': null,
        'resize': true
      });
      this.fourd = $('#display').fourd('underlying_object');

      $scope.construct_grid = (size) => {
        this.fourd.clear();
        var options = {cube: {size: 10, color: 0x000000}};
    
        var rows = [];
        for(var i=0; i<size; i++){
            var column = [];
            for(var j=0; j<size; j++){
                column.push(this.fourd.graph.add_vertex(options));
                if(j>0){
                    fourd.graph.add_edge(column[j], column[j-1]);
                }
                if(i>0){
                    fourd.graph.add_edge(column[j], rows[i-1][j]);
                }
            }
            rows.push(column);
        }

        $scope.grid = rows;
        return rows;
      };

      this.fourd.intersect_callback = function(object){
        object.vertex.set({color: 0xffffff});
      };

      $scope.grid = [];
      $scope.$watch('size', $scope.construct_grid);
    }]
  });
