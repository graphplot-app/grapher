function buildSC($scope){

  $scope.Entity = function(){

  }
  $scope.Entity.id = 0;
  $scope.Entity.all = [];

  var role_id = 0;
  $scope.Role = function(info){
    this.id = $scope.Entity.id++;
    this.type = "Role";
    
    if($scope.Role.all){
      $scope.Role.all.push(this);
    }else{
      $scope.Role.all = [this];
    }
    
    switch(typeof info.person){
      case 'number':
        this.person = $scope.Entity.all.find(p => p.id == info.person);
        break;
      case 'string':
        this.person = $scope.Entity.all.find(p => p.name == info.person);
        break;
      case 'object':
        this.person = info.person;
        break;
      default:
        this.person = info.person;
    }

    switch(typeof info.group){
      case 'number':
        this.group = $scope.Entity.all.find(e => e.id == info.group);
        break;
      case 'string':
        this.group = $scope.Entity.all.find(e => e.name == info.group);
        break;
      case 'object':
        this.group = info.group;
        break;
      default:
        this.group = info.group;
    }

    this.name = !info.name ? info.name : `${this.person.name}@${this.group.name}`;
    this.from = new Date(info.from);
    this.until = new Date(info.until);
    this.texture = info.texture;

    this.vertex = $scope.$fourd.graph.add_vertex({
      cube: {size: 10, texture: info.texture}, 
      label: {offset: 10, text: this.name}
    });

    this.vertex.entity = this;
    
    $scope.$fourd.graph.add_edge(this.vertex, this.person.vertex, {directed: true});
    $scope.$fourd.graph.add_edge(this.group.vertex, this.vertex, {directed: true});

    return this;
  }
  $scope.Role.all = [];

  $scope.Role.prototype.toJSON = function(){
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

  $scope.Role.prototype.set = function(options){
    this.id = options.id !== undefined ? options.id : Entity.id++;
    this.name = options.name !== undefined ? options.name : this.name;
    
    this.from = options.from !== undefined ? new Date(options.from) : this.from;
    this.until = options.until !== undefined ? new Date(options.until) : this.until;
    this.vertex.set(options);
    if(this.vertex.label){
      this.vertex.label.element.innerHTML = this.name;
    }
  };

  var person_id = 0;
  $scope.Person = function(info){
    this.options = info;
    this.id = info.id !== undefined ? info.id : Entity.id++;
    this.type = "Person";
    
    if(!$scope.Person.all){
      $scope.Person.all = [this];
    }else{
      $scope.Person.all.push(this);
    }
    $scope.Entity.all.push(this);
    
    this.name = info.name;
    this.texture = info.texture;
    this.from = new Date(info.from);
    this.until = new Date(info.until);

    this.vertex = $scope.$fourd.graph.add_vertex({
      cube: {
        size: 10,
        texture: info.texture
      },
      label: {
        text: info.name,
        offset: 10
      }
    });
    this.vertex.entity = this;

    this.roles = new Set();
    
    return this;
  };
  $scope.Person.all = [];

  Date.prototype.to_normal = function(){
    return this.valueOf() ? `${this.getFullYear()}-${this.getMonth()+1}-${this.getDate()+1}` : null;
  }

  $scope.Person.prototype.toJSON = function(){
    return {
      "id": this.id,
      "name": this.name,
      "from": this.from.to_normal(),
      "until": this.until.to_normal(),
      "texture": this.texture
    };
  };

  $scope.Person.prototype.set = function(options){
    this.id = options.id;
    this.name = options.name !== undefined ? options.name : this.name;
    if(this.vertex.label){
      this.vertex.label.element.innerHTML = options.name !== undefined ? options.name : this.name;
    }
    this.from = options.from !== undefined ? new Date(options.from) : this.from;
    this.until = options.until !== undefined ? new Date(options.until) : this.until;
    this.vertex.set(options);
  };

  var group_id = 0;
  $scope.Group = function(info){
    this.options = info;
    this.id = info.id !== undefined ? info.id : Entity.id++;
    this.type = "Group";
    
    this.name = info.name
    this.texture = info.texture;
    this.from = new Date(info.from);
    this.until = new Date(info.until);

    if(!$scope.Group.all){
      $scope.Group.all = [this];
    }else{
      $scope.Group.all.push(this);
    }
    $scope.Entity.all.push(this)
    
    this.roles = new Set();

    this.vertex = $scope.$fourd.graph.add_vertex({
      cube: {
        size: 10,
        texture: info.texture
      },
      label: {
        text: info.name,
        offset: 10
      }
    });
    this.vertex.entity = this;

    return this;
  };
  $scope.Group.all = [];

  $scope.Group.prototype.toJSON = function(){
    return {
      id: this.id,
      name: this.name,
      from: this.from.to_normal(),
      until: this.until.to_normal(),
      texture: this.texture
    };
  };

  $scope.Group.prototype.set = function(options){
    this.id = options.id;
    this.name = options.name !== undefined ? options.name : this.name;
    if(this.vertex.label){
      this.vertex.label.element.innerHTML = this.name;
    }
    this.from = options.from !== undefined ? new Date(options.from) : this.from;
    this.until = options.until !== undefined ? new Date(options.until) : this.until;
    this.vertex.set(options);
  };
}