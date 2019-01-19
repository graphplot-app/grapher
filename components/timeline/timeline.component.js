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

      // FourD fourd_history
      var fourd_graph_history = [];
      var fourd_graph_future = [];
      
      fourd_graph_history.undo = function(){
        var event = this.pop();
    
        var undos = {
          'add_vertex': 'remove_vertex',
          'add_edge': 'remove_edge'
        };
    
        if(event){
          this.fourd.graph[undos[event.command]](...event.info);
          fourd_graph_future.unshift({command: event.command, info: event.info});
        }else{
          console.log('fourd_history empty.');
        }
      };
    
      fourd_graph_future.redo = function(){
        var event = this.shift();
        if(event){
          this.fourd.graph[event.command](...event.info);
        }
      };

      $('body').on('keydown', event => {
        if(event.keyCode == 90 && event.ctrlKey){
          fourd_graph_history.undo();
        }

        if(event.keyCode == 89 && event.ctrlKey){
          fourd_graph_future.redo();
        }
      });

      var Cycle = function(vertex_options){
        this.fourd = $('#display').fourd('underlying_object');
        this.elements = [];
        this.edges = [];
        this.last_edge = null;
        this.vertex = this.fourd.graph.add_vertex(vertex_options);
        return this;
      }

      Cycle.prototype.add_vertex = function(v){
        this.elements.push(v);
        if(this.elements.length > 2){
          this.fourd.graph.add_edge(
            this.elements[this.elements.length-1], 
            this.elements[this.elements.length-2]
          );
        }
        if(this.elements.length > 1){
          this.edges[this.elements.length-1] = this.fourd.graph.add_edge(
            this.elements[0],
            v
          );
        }
        return v;
      };

      Cycle.prototype.remove_vertex = function(v){
        var i = this.elements.indexOf(v);
        this.fourd.graph.remove_edge(this.edges[i]);
        this.fourd.graph.add_edge(
          this.elements[i - 1], 
          this.elements[i + 1]
        );
        delete this.elements[i];
        v.remove();
      };

      var add_vertex = this.fourd.graph.add_vertex.bind(this.fourd.graph);
      this.fourd.graph.add_vertex = function(){
        fourd_graph_history.push({command: 'add_vertex', info: arguments});
        return add_vertex(...arguments);
      };

      var add_edge = this.fourd.graph.add_edge.bind(this.fourd.graph);
      this.fourd.graph.add_edge = function(){
        fourd_graph_history.push({command: 'add_edge', info: arguments});
        return add_edge(...arguments);
      };
      
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

      $scope._edit_person = document.querySelector('#edit-person');
      $scope._edit_group = document.querySelector('#edit-group');
      $scope._edit_role = document.querySelector('#edit-role');

      $scope._person_list = document.querySelector('#person-list');
      $scope._group_list = document.querySelector('#group-list');
      $scope._role_list = document.querySelector('#role-list');

      // general collections
      $scope.people = []; // i'm surprised this works. 
      $scope.groups = [];
      $scope.roles = [];

      // event handlers for selecting vertices
      $('#display').on('click', event => {
        var vertex = this.fourd.resolve_click(event);
        if(vertex){
          this.fourd.select(vertex);
        }else{
          this.fourd.deselect();
        }
        console.log(vertex);
      });

      var person_to_json = function(){
        return {
          name: this.name,
          birth: this.birth instanceof Date ? this.birth.toJSON() : null,
          death: this.death instanceof Date ? this.death.toJSON() : null,
          picture: this.picture
        };
      };

      var group_to_json = function(){
        return {
          name: this.name,
          start: this.start instanceof Date ? this.start.toJSON() : null,
          end: this.end instanceof Date ? this.end.toJSON() : null,
          picture: this.picture
        };
      };

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
          content: `*${name}`,
          birth: birth,
          death: death,
          start: birth,
          end: death,
          picture: picture,
          toJSON: person_to_json
        };

        person.vertex = $scope.people[person.name] = this.fourd.graph.add_vertex({cube: {size: 10, texture: picture || 'img/person.white.png'}, label: {text: person.name}});
        this.dataset.add(person);
        $scope.people.push(person);

        $('#person-name').val(null);
        $('#person-birth').val(null);
        $('#person-death').val(null);
        $('#person-picture').val(null);
        $scope.person_picture = null;
      };

      $scope.import_person = (person) => {
        person._type = 'person';
        person.start = person.birth,
        person.end = person.death,
        person.toJSON = person_to_json;

        person.vertex = $scope.people[person.name] = this.fourd.graph.add_vertex({cube: {size: 10, texture: person.picture || 'img/person.white.png'}, label: {text: person.name}});
        this.dataset.add(person);
        $scope.people.push(person);
      };

      $scope.import_group = (group) => {
        group._type = 'group';
        group.content = group.name;
        group.toJSON = group_to_json;

        group.cycle = new Cycle({cube: {size: 10, texture: group.picture}, label: {text: group.name}});
        group.vertex = $scope.groups[group.name] = group.cycle.vertex;
        this.dataset.add(group);
        $scope.groups.push(group);
      };

      $scope.import_role = (role) => {
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
          toJSON: group_to_json
        };

        group.cycle = new Cycle({cube: {size: 10, texture: group.picture}, label: {text: group.name}});
        group.vertex = $scope.groups[group.name] = group.cycle.vertex;

        this.dataset.add(group);
        $scope.groups.push(group);

        $('#group-name').val(null);
        $('#group-start').val(null);
        $('#group-end').val(null);
        $('#group-picture').val(null);
        $scope.group_picture = null;
      };

      $scope.download_graph = () => {
        var filename = prompt('What would you like to call this file? Suggested file ending is .json', 'graph.json');
        if(!filename){
          return;
        }
        var output = JSON.stringify({
          people: $scope.people.map(p => p.toJSON()),
          groups: $scope.groups.map(g => g.toJSON()),
          roles: $scope.roles.map(r => r.toJSON())
        });

        download(output, filename);
      };

      document.querySelector('#person-picture').loadPersonPicture = () => {
        var input = document.querySelector('#person-picture');
        var reader = new FileReader();
        reader.onload = (e) => {
          $scope.person_picture = reader.result;
        };
        reader.readAsDataURL(input.files[0]);
      };

      document.querySelector('#edit-person-picture').loadPersonPicture = () => {
        var input = document.querySelector('#edit-person-picture');
        var reader = new FileReader();
        reader.onload = (e) => {
          $scope.edit_person_picture = reader.result;
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
        var role_input = $('#role-input').val().split('@');

        var minor = 
          $scope.people.find(person => person.name == role_input[0]) ||
          $scope.groups.find(group => group.name == role_input[0]);
        var major = $scope.groups.find(group => group.name == role_input[1]);

        var role_name = minor.name + '@' + major.name;

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

        var vertex = $scope.roles[role_name] = this.fourd.graph.add_vertex({
          cube: {
            size: 10, 
            texture: role.picture
          },
          label: {
            text: role_name
          }
        });
        role.vertex = vertex; 

        major.cycle.add_vertex(vertex);

        this.fourd.graph.add_edge(
          major.vertex, 
          role.vertex
        );
        
        this.fourd.graph.add_edge(
          role.vertex, 
          minor.vertex
        );

        this.dataset.add(role);
        $scope.roles.push(role);
        $('#role-input').val(null);
        $('#role-start').val(null);
        $('#role-end').val(null);
        $('#role-picture').val(null);
        $scope.role_picture = null;
      };

      $scope.delete_person = (id) => {
        var person = $scope.people.find(p => p.id == id);
        this.dataset.remove(person.id);
        this.fourd.graph.remove_vertex(person.vertex);
        delete $scope.people[$scope.people.indexOf(person)];
        $scope.people = $scope.people.splice($scope.indexOf(person), 1);
        delete person;
      };

      $scope.delete_group = (id) => {
        var group = $scope.groups.find(g => g.id == id);
        this.dataset.remove(group.id);
        group.cycle.remove();
        this.fourd.graph.remove_vertex(group.vertex);
        $scope.groups.splice($scope.indexOf(group), 1);
      };

      $scope.edit_person = (id) => {
        var person = $scope.people.find(p => p.id == id);
        $('#edit-person-name').val(person.name);
        $('#edit-person-birth').val(person.birth);
        $('#edit-person-death').val(person.death);
        $scope._edit_person.showModal();
      };

      $scope.process_edit_person = () => {
        person.name = $('#edit-person-name').val();
        person.birth = $('#edit-person-birth').val();
        person.death = $('#edit-person-death').val();
      
        if($scope.edit_person_picture){
          person.vertex.set({texture: $scope.edit_person_picture, text: person.name});
        }

        $('#edit-person-name').val(null);
        $('#edit-person-birth').val(null);
        $('#edit-person-death').val(null);

      };

      $scope.edit_group = (id) => {
        var group = $scope.groups.find(g => g.id == id);
        $('#edit-person-name').val(group.name);
        $('#edit-person-start').val(group.start);
        $('#edit-person-end').val(group.end);
        $scope._edit_person.showModal();
      };

    }]});