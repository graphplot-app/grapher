angular
  .module('Timeline', [])
  .component('timeline', {
    templateUrl: 'components/timeline/timeline.t.html',
    controller: ['$scope', function TimelineCtrl($scope){

      /* Set up the page elements */
      // fourd
      $('#display').fourd({
        'width': () => window.innerWidth-40, 
        'height': () => window.innerHeight-40, 
        'background': null,
        'resize': true
      });
      this.fourd = $('#display').fourd('underlying_object');

      // vis.js timeline
      this.dataset = new vis.DataSet();
      this.dataset.add({
        start: new Date(),
        content: 'Hello, Worlds!'
      });
      $scope.events = this.dataset.get();

      this.timeline = new vis.Timeline(
        document.querySelector('#timeline-container'), 
        this.dataset, 
        {type: 'point'}
      );

      // elements for the image buttons to find
      $scope._person = document.querySelector('#person');
      $scope._group = document.querySelector('#group');
      $scope._role = document.querySelector('#role');

      $scope._person_list = document.querySelector('#person-list');
      $scope._group_list = document.querySelector('#group-list');
      $scope._role_list = document.querySelector('#role-list');

      // general collections
      $scope.people = [];
      $scope.groups = [];
      $scope.roles = [];

      // event handlers for the dialogs
      $scope._process_person = () => {
        var name = $('#person-name').val();
        var birth = $('#person-birth').val();
        var death = $('#person-death').val();
        var picture = $scope.person_picture;

        console.log(picture);

        var person = {
          _type: 'person',
          name: name,
          content: name,
          birth: birth,
          death: death,
          start: birth,
          end: death,
          picture: picture,
          toJSON: function(){
            return {
              name: this.name,
              birth: this.birth instanceof Date ? this.birth.toJSON() : null,
              death: this.death instanceof Date ? this.death.toJSON() : null,
              picture: this.picture
            }
          }
        };

        person.vertex = $scope.people[person.name] = this.fourd.graph.add_vertex({cube: {size: 10, texture: picture || 'img/person.white.png'}, label: {text: person.name}});
        this.dataset.add(person);
        $scope.people.push(person);

        $('#person-name').val(null);
        $('#person-birth').val(null);
        $('#person-death').val(null);
        $('#person-picture').val(null);
      };

      $scope._process_group = () => {
        var name = $('#group-name').val();
        var start = $('#group-start').val();
        var end = $('#group-end').val();

        var group = {
          _type: 'group',
          name: name,
          content: name,
          start: start,
          end: end,
          picture: $scope.group_picture || 'img/group.white.png',
          toJSON: function(){
            return {
              name: this.name,
              start: this.start instanceof Date ? this.start.toJSON() : null,
              end: this.end instanceof Date ? this.end.toJSON() : null,
              picture: this.picture
            }
          }
        };

        group.vertex = $scope.groups[group.name] = this.fourd.graph.add_vertex({cube: {size: 10, texture: group.picture}, label: {text: group.name}});
        this.dataset.add(group);
        $scope.groups.push(group);

        $('#group-name').val(null);
        $('#group-start').val(null);
        $('#group-end').val(null);
        $('#group-picture').val(null);
      };

      var Cycle = function(){
        this.elements = [];
        this.last_edge = null;
        return this;
      }

      Cycle.prototype.add_vertex = (v) => {
        this.elements.push(v);
        if(this.elements.length > 2){
          this.fourd.graph.remove_edge(this.last_edge);
        }

        this.second_to_last_edge = this.fourd.graph.add_edge(this.elements[this.elements.length-2], this.elements[this.elements.length-1]); 
        this.last_edge = this.fourd.graph.add_edge(this.elements[0], this.elements[this.elements.length-1], {directed: false});
      }

      Cycle.prototype.remove_vertex = function(v){
      }

      $scope.download_graph = () => {
        var filename = prompt('What would you like to call this file? Suggested file ending is .json', 'graph.json');
        var output = JSON.stringify({
          people: $scope.people.map(p => p.toJSON()),
          groups: $scope.groups.map(g => g.toJSON()),
          roles: $scope.roles.map(r => r.toJSON())
        });

        download(output, filename);
      }

      document.querySelector('#person-picture').loadPersonPicture = () => {
        var input = document.querySelector('#person-picture');
        var reader = new FileReader();
        reader.onload = (e) => {
          console.log(reader.result);
          $scope.person_picture = reader.result;
        };
        reader.readAsDataURL(input.files[0]);
      };

      document.querySelector('#group-picture').loadGroupPicture = () => {
        var input = document.querySelector('#group-picture');
        var reader = new FileReader();
        reader.onload = (e) => {
          console.log(reader.result);
          $scope.group_picture = reader.result;
        };
        reader.readAsDataURL(input.files[0]);
      };

      document.querySelector('#role-picture').loadRolePicture = () => {
        var input = document.querySelector('#role-picture');
        var reader = new FileReader();
        reader.onload = (e) => {
          console.log(reader.result);
          $scope.role_picture = reader.result;
        };
        reader.readAsDataURL(input.files[0]);
      };

      $scope._process_role = () => {
        var person_id = $('#role-person').val();
        var group_id= $('#role-group').val();

        var person = $scope.people[person_id];
        var group = $scope.groups[group_id];

        var role_name = person.name + '@' + group.name;

        var role = {
          _type: 'role',
          name: role_name,
          start: $('#role-start').val(),
          end: $('#role-end').val(),
          picture: $scope.role_picture || 'img/role.white.png',
          toJSON: function(){
            return {
              name: this.name,
              start: this.start instanceof Date ? this.start.toJSON() : null,
              end: this.end instanceof Date ? this.end.toJSON() : null,
              picture: this.picture
            };
          }
        };

        var vertex = $scope.roles[role_name] = this.fourd.graph.add_vertex({cube: {size: 10, texture: role.picture, label: {text: role_name}}})
        role.vertex = vertex; 

        this.fourd.graph.add_edge(group.vertex, role.vertex, {directed: true});
        this.fourd.graph.add_edge(role.vertex, person.vertex, {directed: true});

        this.dataset.add(role);
        $scope.roles.push(role);

        $('#role-person').val(null);
        $('#role-group').val(null);
        $('#role-start').val(null);
        $('#role-end').val(null);
        $('#role-picture').val(null);

      };
    }]});