/*
  jquery.social-cartography.js

  Joshua Marshall Moore
  May 11th, 2018
  Monmouth, Oregon, United States

  August 4th, 2018
  North Las Vegas, Nevada, United States

  October 26th, 2018
  North Las Vegas, Nevada, United States
*/

(function($){

  var fourd = null;
  var selected = null;

  persons = []; // do you think we'll get released? 
  groups = []; // i don't know, what do you think it's like?
  roles = []; // i hope it doesn't hurt... history, do you know?

  var history = []; // nah, no clue yet
  var future = [];
  
  history.undo = function(){
    var event = this.pop();

    var undos = {
      'add_person': 'remove_person',
      'add_group': 'remove_group',
      'add_role': 'remove_role'
    };

    if(event){
      $('#display').social_cartography(undos[event.command], event.id);
      future.unshift(event.command, event.info);
    }else{
      console.log('history empty.');
    }
  }

  future.redo = function(){
    var event = this.shift();
    if(event){
      $('#display').social_cartography(event.command, event.info);
    }
  }

  var Entity = function(){

  }
  Entity.id = 0;
  Entity.all = [];
  
  var role_id = 0;
  var Role = function(info){
    this.id = Entity.id++;
    this.type = "Role";
    
    if(Role.all){
      Role.all.push(this);
    }else{
      Role.all = [this];
    }
    
    switch(typeof info.person){
      case 'number':
        this.person = Person.all.find(p => p.id == info.person);
        break;
      case 'string':
        this.person = Person.all.find(p => p.name == info.person);
        break;
      case 'object':
        this.person = info.person;
        break;
    }

    switch(typeof info.group){
      case 'number':
        this.group = Group.all.find(g => g.id == info.group);
        break;
      case 'string':
        this.group = Group.all.find(g => g.name == info.group);
        break;
      case 'object':
        this.group = info.group;
        break;
    }
    
    this.name = `${this.person.name}@${this.group.name}`;
    this.from = new Date(info.from);
    this.until = new Date(info.until);
    this.texture = info.texture;

    this.vertex = fourd.graph.add_vertex({
      cube: {size: 10, texture: info.texture}, 
      label: {offset: 50, text: this.name}
    });

    this.vertex.entity = this;
    
    fourd.graph.add_edge(this.vertex, this.person.vertex, {directed: true});
    fourd.graph.add_edge(this.group.vertex, this.vertex, {directed: true});

    return this;
  }
  Role.all = [];

  Role.prototype.toJSON = function(){
    return {
      id: this.id,
      person: this.person.id,
      group: this.group.id,
      name: this.name,
      from: this.from.to_normal(),
      until: this.until.to_normal(),
      texture: this.texture
    };
  };

  Role.prototype.set = function(options){
    this.name = options.name !== undefined ? options.name : this.name;
    this.from = options.from !== undefined ? new Date(options.from) : this.from;
    this.until = options.until !== undefined ? new Date(options.until) : this.until;
    this.vertex.set(options);
  };
  
  var person_id = 0;
  var Person = function(info){
    this.options = info;
    this.id = Entity.id++;
    this.type = "Person";
    
    if(!Person.all){
      Person.all = [this];
    }else{
      Person.all.push(this);
    }
    
    this.name = info.name;
    this.texture = info.texture;
    this.from = new Date(info.from);
    this.until = new Date(info.until);

    this.vertex = fourd.graph.add_vertex({
      cube: {
        size: 10,
        texture: info.texture
      },
      label: {
        text: info.name,
        offset: 50
      }
    });
    this.vertex.entity = this;

    this.roles = new Set();
    
    return this;
  };
  Person.all = [];

  Date.prototype.to_normal = function(){
    return this.valueOf() ? `${this.getFullYear()}-${this.getMonth()+1}-${this.getDate()+1}` : null;
  }
  
  Person.prototype.toJSON = function(){
    return {
      id: this.id,
      name: this.name,
      from: this.from.to_normal(),
      until: this.until.to_normal(),
      texture: this.texture
    };
  };

  Person.prototype.set = function(options){
    this.name = options.text !== undefined ? options.text : this.name;
    this.from = options.from !== undefined ? new Date(options.from) : this.from;
    this.until = options.until !== undefined ? new Date(options.until) : this.until;
    this.vertex.set(options);
  };

  var group_id = 0;
  var Group = function(info){
    this.options = info;
    this.id = Entity.id++;
    this.type = "Group";
    
    this.name = info.name
    this.texture = info.texture;
    this.from = new Date(info.from);
    this.until = new Date(info.until);

    if(!Group.all){
      Group.all = [this];
    }else{
      Group.all.push(this);
    }
    
    this.roles = new Set();

    this.vertex = fourd.graph.add_vertex({
      cube: {
        size: 10,
        texture: info.texture
      },
      label: {
        text: info.name,
        offset: 50
      }
    });
    this.vertex.entity = this;

    return this;
  };
  Group.all = [];

  Group.prototype.toJSON = function(){
    return {
      id: this.id,
      name: this.name,
      from: this.from.to_normal(),
      until: this.until.to_normal(),
      texture: this.texture
    };
  };

  Group.prototype.set = function(options){
    this.name = options.name !== undefined ? options.name : this.name;
    this.from = options.from !== undefined ? new Date(options.from) : this.from;
    this.until = options.until !== undefined ? new Date(options.until) : this.until;
    this.vertex.set(options);
  };
  
  $.widget('jmm.social_cartography', {
    options: {
      background: 0x004477,
      border: 0,
      width: window.innerwidth,
      height: window.innerHeight
    },
    
    _create: function(options){
      var settings = {};
      $.extend(settings, this.options, {
        display: 'block',
        margin: 0,
        padding: 0,
        border: 0,
        overflow: 'hidden',
        background: 0x004477,
        width: window.innerWidth,
        height: window.innerHeight
      }, options);
      
      var that = this;
      
      $(this).css($.extend({
        display: "block",
        border: this.options.border
      }, this.options));

      $(this).width(this.options.width);
      $(this).height(this.options.height);
      
      fourd = new FourD();
      fourd.init(this.element, {
        width: this.options.width,
        height: this.options.height,
        background: this.options.background
      });
      
      $('#show-labels').change(function(){
        if($(this).is(':checked')){
          $('#labels-hidden').remove();
        }else{
          $(`
            <style id="labels-hidden">
              .text-label { visibility: hidden; } 
            </style>`
          ).appendTo('html > head');
        }
      })

      var role_exists = function(person, group){
        for(var i=0; i<roles.length; i++){
          if(roles[i].person.id == person.id && roles[i].group.id == group.id){
            return roles[i];
          }
        }
        return false;
      }

      var on_mousedown = function(event){
        selected = fourd.resolve_click(event);
        fourd.selected = selected;
      };
      
      var on_dblclick = function(event){
        console.log(selected);
        fourd.select(selected);
      };
      
      $(this).addClass('fourd');
      $(this).addClass('social-cartography');
      
      // $('#display').on('mousedown', on_mousedown);
      $('#info').accordion();

      var submit_person = function submit_person(){
        var info = {
          name: $('#person-name').val(),
          texture: 'img/person.png'
        };
        
        var person = $('#display').social_cartography('add_person', info);
        $('#person-name').val('');
      };

      $('#submit-person').click(submit_person);
      $('#person-name').on('keydown', (event) => {
        if(event.keyCode == 13) submit_person();
      })
      

      var submit_group = function(){
        var info = {
          name: $('#group-name').val(),
          texture: 'img/group.png'
        };
        
        var group = $('#display').social_cartography('add_group', info);
        $('#group-name').val('');
      };

      $('#submit-group').click(submit_group);
      $('#group-name').on('keydown', event => {
        if(event.keyCode == 13) submit_group();
      });


      $('#role-description').on('keydown', event => {
        if(event.keyCode == 13) {
          var input = $('#role-description').val();
          var at_i = input.indexOf('@');
          var person_name = input.substr(0, at_i);
          var group_name = input.substr(at_i + 1);

          console.log(person_name, group_name);

          try{
            person = Person.all.find(p => p.name === person_name);
            if(person === undefined){
              person = Group.all.find(p => p.name === person_name); // highly experimental
            }
          }catch(e){
            console.error(e);
          }

          if(person === undefined){
            person = $('#display').social_cartography('add_person', {name: person_name, texture: 'img/person.png'});
          }

          try{
            group = Group.all.find(g => g.name === group_name);
            if(group === undefined){
              group = Person.all.find(g => g.name === group_name);
            }
          }catch(e){
            console.error(e);
          }

          if(group === undefined){
            group = $('#display').social_cartography('add_group', {name: group_name, texture: 'img/group.png'});
          }

          var role = $('#display').social_cartography('add_role', {person: person, group: group, texture: 'img/role.png'});
          $('#role-description').val('');
        }
      
        if(event.keyCode == 90 && event.ctrlKey){
          history.undo();
        }

        if(event.keyCode == 89 && event.ctrlKey){
          future.redo();
        }
      });
      
      var role_person = null;
      var role_group = null;

      var submit_role = function(){
        $('#isplay').social_cartography('add_role', {person: prompt('Person'), group: prompt('Group')});
        $(this).val(null);
      };
      
      $('#submit-role').click(submit_role);
      $('#new-role>*').on('keypress', (event) => {
        if(event.keyCode == 13){
          submit_role();
        }

        return true;
      });
    
      // set up draggable area
      var dropArea = document.querySelector('#body');

      var dragOverHandler = (ev) => {
        console.log('File(s) in drop zone'); 
      
        // Prevent default behavior (Prevent file from being opened)
        ev.preventDefault();
      }

      document.addEventListener('dragover', dragOverHandler, false);

      var removeDragData = (ev) => {
        console.log('Removing drag data');
      
        if (ev.dataTransfer.items) {
          // Use DataTransferItemList interface to remove the drag data
          ev.dataTransfer.items.clear();
        } else {
          // Use DataTransfer interface to remove the drag data
          ev.dataTransfer.clearData();
        }
      };

      var dropHandler = (ev) => {
        console.log('File(s) dropped');
      
        // Prevent default behavior (Prevent file from being opened)
        ev.preventDefault();
      
        if (ev.dataTransfer.items) {
          // Use DataTransferItemList interface to access the file(s)
          for (var i = 0; i < ev.dataTransfer.items.length; i++) {
            // If dropped items aren't files, reject them
            if (ev.dataTransfer.items[i].kind === 'file') {
              var file = ev.dataTransfer.items[i].getAsFile();
              console.log('... file[' + i + '].name = ' + file.name);

              this.import(file);
            }
          }
        } else {
          // Use DataTransfer interface to access the file(s)
          for (var i = 0; i < ev.dataTransfer.files.length; i++) {
            console.log('... file[' + i + '].name = ' + ev.dataTransfer.files[i].name);
          }
        } 
        
        // Pass event to removeDragData for cleanup
        removeDragData(ev)
      };

      document.addEventListener('drop', dropHandler, false);
      var that = this;
      $(document).on('click', '.text-label', function(event){
        that.edit(event.target.vertex);
      });

      return this;
    },

    edit: function(vertex){
      this.editing_vertex = vertex;
      var entity = vertex.entity;
      $('#edit-entity-form').inputValues(entity.toJSON());

      var edit_vertex = document.querySelector('#edit-vertex');
      edit_vertex.showModal();
      $('#confirm-edit-vertex').one('click', () => {
        this.editing_vertex.entity.set($('#edit-entity-form').inputValues());
        this.editing_verex = null;
      });
    },
    
    add_person: function(info){
      person = new Person(info);
      
      person.options = info;
      history.push({command: 'add_person', info: person.options, id: person.id});

      return person;
    },
    
    remove_person: function(id){
      var index = -1;
      var person = Person.all.find(function(value, idx){
        if(value.id === id){
          index = idx;
          return true;
        }

        return false;
      });

      if(person){
        fourd.graph.remove_vertex(person.vertex);
        Person.all.splice(index, 1);
      }
    },
    
    add_group: function(info){
      group = new Group(info);

      group.options = info;
      history.push({command: 'add_group', info: group.options, id: group.id});
      
      return group;
    },
    
    remove_group: function(id){
      var index = -1;
      var group = Group.all.find(function(value, idx){
        if(value.id === id){
          index = idx;
          return true;
        }

        return false;
      });

      if(group){
        fourd.graph.remove_vertex(group.vertex);
        Group.all.splice(index, 1);
      }
    },
    
    add_role: function(info){
      if(typeof info.person == 'string'){
        var person_name = info.person;
        try{
          if(!Person.all) throw 'error';
          info.person = Person.all.find(p => p.name == info.person);
        }catch(e){
          console.error(e);
        }
        if(info.person == undefined){
          info.person = $('#display').social_cartography('add_person', {name: person_name, texture: 'img/person.png'});
        }
      }else if(typeof info.person == 'number'){
        info.person = Person.all.find(p => p.id == info.person);
      }

      if(typeof info.group == 'string'){
        var group_name = group;
        try{
          if(!Group.all) throw 'error';
          info.group = Group.all.find(g => g.name == group);
        }catch(e){
          console.error(e);
        }
        if(group == undefined ){
          info.group = $('#display').social_cartography('add_group', {name: group_name, texture: 'img/group.png'});
        }
      }else if(typeof group == 'number'){
        info.group = Group.all.find(g => g.id == group);
      }
      console.log(person, group);

      var role = new Role(info); // creates its own vertex, incosistent with Person and Group!!!

      // history
      role.info = {person: person, group: group};
      history.push({command: 'add_role', info: role.info, id: role.id});
      return role;
    },
    
    remove_role: function(id){
      var index = -1;
      var role = Role.all.find(function(val, idx){
        if(val.id === id){
          index = idx;
          return true;
        }

        return false;
      });
      fourd.graph.remove_vertex(role.vertex);
      Role.all.splice(index, 1);

      return true;
    },
    
    // not sure what to do here...
    clear: function(){
      fourd.graph.clear();
      Person.all = [];
      Group.all = [];
      Role.all = [];
      persons = [];
      groups = [];
      roles = [];
    },
    
    export: function(){
      var output = {
        persons: Person.all.map(person => person.toJSON()), 
        groups: Group.all.map(group => group.toJSON()), 
        roles: Role.all.map(role => role.toJSON())
      };

      var filename = prompt("Enter a filename: ", "graph.sc.json");
      download(JSON.stringify(output), filename);
    },
    
    import: function(file){
      
      var input;
      if(file){
        input = file;
      }else{
        input = document.getElementById('upload').files[0];
      }

      var reader = new FileReader();
      reader.readAsText(input);
      reader.onload = (e) => {
        input = reader.result;
        input = JSON.parse(input);
        
        var all = [
          ...input.persons.map(p => Object.assign(p, {type: 'person'})),
          ...input.groups.map(g => Object.assign(g, {type: 'group'})), 
          ...input.roles.map(r => Object.assign(r, {type: 'role'}))
        ].sort((a, b) => a.id - b.id);

        console.log(all);
        all.map(entity => {
          switch(entity.type){
            case 'person':
              this.add_person(entity);
              break;
            case 'group':
              this.add_group(entity);
              break;
            case 'role': 
              this.add_role(entity);
              break;
          }
        });
        
        console.log('done importing entities.')
      }
    },
    
    _destroy: function(){
      $(this).removeClass('social-cartogrraphy');
    },
    
    select: function(entity, event){
      // this is where code can go for doing something when a vertex is clicked, i think. 
      
    }
  });
}(jQuery));
