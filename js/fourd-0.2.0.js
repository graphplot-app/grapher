'use strict';
/*
 four-d.js
 Joshua M. Moore
 December 9th, 2018
 
 Here's how it works:
 
 var fourd = new FourD(); // instantiation
 fourd.init('#selector', {width: 600, height: 350}); // initialization.
 
 var vertex_options = {
   cube: {
     size: 10,
    texture: 'path_to,png'
   },
   label: {
     text: 'Hello, World'
   }
 };
 
 var vertex1 = fourd.graph.add_vertex(vertex_options); // add a vertex
 var vertex2 = fourd.graph.add_vertex(vertex_options); // add another vertex
 
 var edge_options = {directed: false}; // currently not defined, but this is how you would pass them.
 
 var edge = fourd.graph.add_edge(vertex1, vertex2, edge_options);
 
 fourd.graph.remove_edge(edge); // this is why you keep those variables
 fourd.graph.remove_vertex(vertex1);
 fourd.graph.remove_vertex(vertex2);
*/

var FourD = function(){

  var that = this;
  var CONSTANTS = {
    width: 1000,
    attraction: 0.05,
    far: 1000,
    optimal_distance: 10.0,
    minimum_velocity: 0.001,
    friction: 0.60,
    zoom: -25,
    gravity: 10, 
    BHN3: {
      inner_distance: 0.36,
      repulsion: 25.0,
      epsilon: 0.1
    }
  };

  /* 
    Vertex
    
    Creates a vertex which can be passed to Graph. 
    setting a label property in the options parameter can allow
    for a label to be drawn above or below a vertex. 
    
    Options:
    - invisible
    - see cube
    - see label
    
  */
  var Vertex = function(id, options){
    this.options = options || {};
    this.id = id;
    
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.acceleration = new THREE.Vector3(0, 0, 0);
    
    this.toString = function(){
      return this.id.toString();
    };

    this.edges = new Set();
    
    if(!this.options.hasOwnProperty('label')){
      this.options.label = {
        text: '',
        direction: 'x',
        distance: '10'
      };
    };
  };

  var Label = function(options){
    options = Object.assign({offset: 25}, options);
    
    // thanks, https://codepen.io/dxinteractive/pen/reNpOR
    var _createTextLabel = function() {
      var div = document.createElement('div');
      document.body.appendChild(div);
      div.className = 'text-label';
      div.style.position = 'absolute';
      div.style.width = 100;
      div.style.height = 100;
      div.innerHTML = options.text;
      div.style.top = -1000;
      div.style.left = -1000;
      
      /*
        div.on click:
          place text of div into value of textbox
          turn div into textbox
          on blur:
            turn textbox into div
            place value of textbox into text of div and name of selected entity
        turn div into link.
      */

      // div on click
      var _this = this;
 
      var label = {
        element: div,
        parent: options.object,
        position: new THREE.Vector3(),
        updatePosition: function(camera) {
          if(parent) {
            this.position.copy(this.parent.position);
          }
          
          var coords2d = this.get2DCoords(this.position, camera);
          this.element.style.left = coords2d.x + 'px';
          this.element.style.top = coords2d.y + 'px';
        },
        get2DCoords: function(position, camera) {
          var vector = position.project(camera);
          vector.x = (vector.x + 1)/2 * window.innerWidth;
          vector.y = -(vector.y - 1)/2 * window.innerHeight + options.offset;
          return vector;
        },
        remove: () => {
          console.log('remove');
          document.body.removeChild(div);
        }
      };

      options.vertex.label = label;
      return label;
    };

    var label = _createTextLabel();
    if(Label.all){
      Label.all.push(label);
    }else{
      Label.all = [label];
    }
    return label;

		//var sprite = makeTextSprite(options.text, options);
    // return sprite;
  };

  Label.all = [];

  Vertex.prototype.paint = function(scene){
    this.object = new THREE.Group();
    this.object.position.set(
      Math.random(),
      Math.random(),
      Math.random()
    );
    
    if(!this.options){
      this.options = {
        cube: {
          size: 10, 
          color: 0xffffff,
          wireframe: false
        }
      };
    }

    if(this.options.cube){
      var cube = new Cube(this.options.cube);
			cube.geometry.computeFaceNormals();
      this.object.add(cube);
      cube.position.set(0, 0, 0);
			cube.vertex = this;
    }
    if(this.options.label && this.options.label.text){
      this.options.label.object = this.object;
      this.options.label.vertex = this;
      var label = new Label(this.options.label);
    }
    
    scene.add(this.object);
  };

  Vertex.prototype.set = function(options){
    if(options.color !== undefined){
      this.cube.material.color = options.color;
      this.cube.material.needsUpdate = true;
    }
    if(options.texture !== undefined){
      this.cube.material.map = new THREE.TextureLoader().load( options.texture );
      this.cube.material.needsUpdate = true;
      this.texture = options.texture;
    }
    if(options.text !== undefined){
      this.label.element.innerHTML = options.text;
    }
  };
  
  /* 
    Vertex.remove(...) 
    removes either a label: Vertex.remove('label'),
    or the vertex's cube: Vertex.remove('cube').
  */ 
  Vertex.prototype.remove = function(name){
    if(this.label){
      this.label.remove();
    }
    this.object.remove(name);
  }
  
  Vertex.prototype.replace_cube = function(options){
    this.options = options;
    scene.remove(this.object);
    this.paint(scene);
    for(var edge in this.edges){
      scene.remove(edge.object);
      if(this.edge.source == this){
        edge.object = line(scene, this, edge.target, edge.options);
      }else{
        edge.object = line(scene, edge.source, this, edge.options)
      }
    }
  }

  var CameraVertex = function(id, camera){
      Vertex.call(this, id);
      this.object = camera;
      this.id = id;
  };
  CameraVertex.prototype = Object.create(Vertex.prototype);
  CameraVertex.prototype.constructor = CameraVertex;
	
  // Edge
  var Edge = function(id, source, target, options){
    this.options = options === undefined ? {strength: 1.0} : options;
    
    if(arguments.length < 3){
      throw new Error('Edge without sufficent arguments');
    }

    this.id = id;

    this.source = source;
    this.target = target;

    this.source.edges.add(this);
    this.target.edges.add(this);

    this.order = Math.random();
  };

  Edge.prototype.paint = function(scene, options){
    options = options || {
      color: 0xffffff
    }
    this.object = line(scene, this.source, this.target, options);
  };

  Edge.prototype.toString = function(){
    return this.source.toString() + '-->' + this.target.toString(); 
  };

  Edge.prototype.destroy = function(scene){
    this.source.edges.delete(this);
    this.target.edges.delete(this);
    
    CONSTANTS.scene.remove(this.object);
    delete this.object;
  };
	
  // Graph
  var graph_id_spawn = 0;
  var Graph = function(scene){
    this.id = graph_id_spawn++;
    this.scene = scene;
    this.type = 'Graph';

    this.changed = false;

    this.vertex_id_spawn = 0;
    this.V = new Set();

    this.edge_id_spawn = 0;
    this.E = new Set();

    this.temperature = 0.00;
  };

  // api
  Graph.prototype.clear = function(){
    this.E.forEach(edge => edge.destroy(this.scene));
    this.V.forEach(vertex => scene.remove(vertex));

    this.V.clear();
    this.E.clear();

    this.changed = false;
    this.temperature = 0.00;

    this.edge_id_spawn = 0;
    this.vertex_id_spawn = 0;
  };

  Graph.prototype._make_key = function(source, target){
    return '_' + source.toString() + '_' + target.toString();
  };

  Graph.prototype.add_vertex = function(options){
    options = options || {};
    
    var v = new Vertex(this.vertex_id_spawn++, options);
    v.paint(this.scene);
    v.object.vertex = v;
    this.V.add(v);

    this.changed = true;
    return v;
  };

  Graph.prototype.add_camera_vertex = function(camera){
    var v = new CameraVertex(this.vertex_id_spawn++, camera);
    v.position = v.object.position;
    this.V.add(v);
    return v;
  };

  Graph.prototype.add_edge = function(source, target, options){

    var edge = arguments[0] instanceof Edge ? arguments[0] : new Edge(this.edge_id_spawn++, source, target, options);
    edge.paint(this.scene);
    
    this.E.add(edge);
    this.changed = true;

    return edge;
  };
	
	Graph.prototype.add_invisible_edge = function(source, target){
		return this.add_edge(source, target, {opacity: 0.0});
	}

  Graph.prototype.remove_edge = function(edge){
    edge.destroy();
    this.E.delete(edge);
    this.changed = true;
  };

  Graph.prototype.toString = function(){
    var edges = this.E.size;
    var vertices = this.V.size;

    return `{|V|=${this.V.size}, |E|=${this.E.size}}`;
  };

  Graph.prototype.remove_vertex = function(vertex){

    console.log('remove', vertex);
    if(vertex.label){
      console.log('remove label')
      vertex.label.remove();
    }

    vertex.edges.forEach(edge => {
      edge.destroy(this.scene);
      this.E.delete(edge);
    });

    this.scene.remove(vertex.object);
    this.V.delete(vertex);
    this.changed = true;
  };

  Graph.prototype.add = function(vertex_or_edge){
    if(vertex_or_edge instanceof Vertex){
      var vertex = vertex_or_edge;
      this.V.add(vertex);
      vertex.paint(scene);
    }

    if(vertex_or_edge instanceof Edge){
      var edge = vertex_or_edge;
      this.E.add(edge);

      if(!this.V.has(edge.source)){
        this.V.add(edge.source);
      }

      if(!this.V.has(edge.target)){
        this.V.add(edge.target);
      }
    }

    return vertex_or_edge;
  }

  Graph.prototype.delete = function(vertex_or_edge){
    if(typeof vertex_or_edge == "Vertex"){
      var vertex = vertex_or_edge;
      
      for(var edge in vertex.edges){
         edge.delete_from(this);
      }
      
      this.V.delete(vertex);
    }
    
    if(typeof vertex_or_edge == "Edge"){
      var edge = vertex_or_edge;
      edge.source.delete_from(this);
      edge.target.delete_from(this);
      this.E.delete(edge);
    }
    
    return vertex_or_edge;
  }

  var is_graph = function(potential){
    return potential.type === 'Graph';
  };



  // apiish
  var Cube = function(options){
    if(options === undefined){
      options = {};
    }
    
    if(options.width === undefined){
      options.width = 3;
    }
    if(options.height === undefined){
      options.height = 3;
    }
    if(options.depth === undefined){
      options.depth = 3;
    }
    if(options.color === undefined){
      options.color = 0xffffff;
    }
    
    if(options.wireframe === undefined){
      options.wireframe = false;
    }
    
    var geometry, material, material_args;
    geometry = new THREE.BoxGeometry(
      options.width,
      options.height,
      options.depth
    );
    geometry.dynamic = true;
    
    if(options.texture !== undefined){
      material_args = { 
        map: new THREE.TextureLoader().load( options.texture )
      };
      
    }else{
      material_args = { 
        color: options.color,
        wireframe: options.wireframe
      };
    }

    material = new THREE.MeshBasicMaterial( material_args );
    
    var cube = new THREE.Mesh( geometry, material );
    var scale = 2;
    cube.position.set(
      Math.random() * scale, 
      Math.random() * scale,
      Math.random() * scale
    );
    cube.matrixAutoUpdate = true;
    
    return cube;
  };

  // apiish this will change
  // todo: make line options like cube options
  var line = function(scene, source, target, options){
    var geometry = new THREE.Geometry();
    geometry.dynamic = true;
    geometry.vertices.push(source.object.position);
    geometry.vertices.push(target.object.position);
    geometry.verticesNeedUpdate = true;
    
		options = options || {};
		options.color = options.color ? options.color : 0xffffff;
		options.transparent = options.transparent ? options.transparent : false;
		options.opacity = options.opacity ? options.opacity : 1.0;
		
    var material = new THREE.LineBasicMaterial(options);
    
    var line = new THREE.Line( geometry, material );
    line.frustumCulled = false;
      
    scene.add(line);
    return line;
  };

  // to store element and its priority
class QElement {
  constructor(element, priority)
  {
    this.element = element;
    this.priority = priority;
  }
}
 
// PriorityQueue class
class PriorityQueue {
 
  // An array is used to implement priority
  constructor(){
    this.items = [];
  }

  /* 
    enqueue function to add element to the queue as per priority
  */
  enqueue(element, priority){
    // creating object from queue element
    var qElement = new QElement(element, priority);
    var contain = false;

    // iterating through the entire
    // item array to add element at the
    // correct location of the Queue
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i].priority > qElement.priority) {
        // Once the correct location is found it is
        // enqueued
        this.items.splice(i, 0, qElement);
        contain = true;
        break;
      }
    }

    // if the element have the highest priority
    // it is added at the end of the queue
    if (!contain) {
      this.items.push(qElement);
    }
  }

  /*
    dequeue method to remove element from the queue
  */
  dequeue(){
    // return the dequeued element
    // and remove it.
    // if the queue is empty
    // returns Underflow
    if (this.empty()) throw "Underflow";
    return this.items.shift().element;
  }

  empty(){
    // return true if the queue is empty.
    return this.items.length == 0;
  }
}

/**
 * class DMVertex
 * 
 * Encapsulates a vertex with a set union operation
 */
class DMVertex extends Vertex {
  
  /**
   * new DMVertex(vertex1, vertex2, ...)
   * 
   * 
   */
  constructor(){
    super(...arguments);
    this.finer = new Set([...arguments]);
    [...this.finer].map(v => {
      v.coarser = this;
    });

    this.object = {};
    this.object.acceleration = new THREE.Vector3();
    this.object.velocity = new THREE.Vector3();
    this.object.position = new THREE.Vector3();
    
    return this;
  }

  /**
   * 
   */
  union(dmvertex){
    return new DMVertex(this, dmvertex);
  }

  has(vertex){
    return this.finer.has(vertex) 
      || [...this.finer].some(v => {
        return (v == vertex) || ((v instanceof DMVertex) && v.finer.has(vertex))
      });
  }
  
  toString(){
    return `DMVertex#${this.id}`;
  }
}
DMVertex.all = new Set();

/**
 * class DMEdge
 * 
 * Encapsulates an edge with a count for multiple edges across the 
 * same vertices. 
 */
class DMEdge extends Edge {
  constructor(edge){
    if(arguments[0] instanceof Edge){
      super(edge.source, edge.target);
      edge.coarser = this;
      this.finer = edge;
    }else{
      super(...arguments);
    }

    this.count = 0;
  }
  
  toString(){
    return `DMEdge#${this.id}(${this.source.id},${this.target.id})`;
  }
}

/**
 * class DynamicMatching
 * 
 * responsible for maintaining coarser and coarser versions of an
 * initially attached graph. 
 */
class DynamicMatching extends Graph {
  /**
   * new DynamicMatching(base Graph|DynamicMatching, Integer)
   * 
   * - base specifies the base graph which is to be reduced, and to which this 
   *   dynamic matching should attach itself to, decorating add and delete in the base 
   *   object.
   * - n specifies how many levels of DynamicMatchings should be produced.
   * 
   * Instantiates the member variables id, finer, coarser, V (Map), E (Set) and pq. 
   */
  constructor(finer, n){
    super();
    this.id = ++DynamicMatching.id;

    this.temperature = 0.00;
    
    this.finer = finer; // the base object
    finer.coarser = this; // a doubly linked list
    this.V = new Map(); // holds the vertices of this dynamic matching
    this.E = new Set(); // holds the edges of this dynamic matching
    this.pq = new PriorityQueue(); // ge
    
    this.m = new Map();
    
    if(n > 0){
      this.coarser = new DynamicMatching(this, --n);
    }

    var finer_add = finer.add.bind(finer);
    var finer_delete = finer.delete.bind(finer);

    var that = this;
    console.log(`${this} rewiring ${finer}'s add and delete.`);
    finer.add = (entity) => {
      console.assert(entity, `entity must exist to be added to ${finer} and ${that}`);
      finer_add(entity);
      if(entity instanceof Edge){
        that.add(entity);
      }
      
      return entity;
    }

    finer.delete = (entity) => {
      console.assert(entity, `entity must exist to be removed from ${that} and ${finer}`);
      finer_delete(entity);
      that.delete(this.get_corresponding(entity));

      return entity;
    }
    
    return this;
  }

  add(v_or_e){
    if(v_or_e instanceof Vertex){
      var vertex = v_or_e;
      this.add_vertex(vertex);
    }
    if(v_or_e instanceof Edge){
      var edge = v_or_e;
      this.add_edge(edge);
    }
    
    this.process_queue();
    return v_or_e;
  }

  /*
    Adds a new DMVertex for the supplied base vertex.
  */
  add_vertex(v){
    
    // "No action needed."
    /*
    if(!this.get_corresponding(v)){
      this.V.set(vertex, new DMVertex(v));
    }
    */
  }

  get_corresponding_edge(e){
    var e_prime = [...this.E].find(e_prime => {
      return e_prime.source.has(e.source) 
        || e_prime.target.has(e.target)
        || e_prime.source.has(e.target)
        || e_prime.target.has(e.source);
    });

    if(!e_prime){
      e_prime = new DMEdge(
        this.get_corresponding(e.source),
        this.get_corresponding(e.target)
      );
      this.E.add(e_prime);
    }

    return e_prime;
  }
  
  get_corresponding_vertex(v){
    var v_prime = this.V.get(v);
    if(!v_prime){
      v_prime = new DMVertex(v);
      this.V.set(v, v_prime);
    }
    return v_prime;
  }
  
  get_corresponding(v_or_e){
    if(v_or_e instanceof Vertex){
      return this.get_corresponding_vertex(v_or_e);
    }
    
    if(v_or_e instanceof Edge){
      return this.get_corresponding_edge(v_or_e);
    }
  }

  add_edge(e){
    // "Increase the count of (v1', v2') in E' possibly adding an edge..."
    var v1_prime = this.get_corresponding(e.source);
    var v2_prime = this.get_corresponding(e.target);
    
    var e_prime = this.get_corresponding(e);
    if(e_prime){
      e_prime.count++;
    }else{
      e_prime = new DMEdge(v1_prime, v2_prime);
      this.E.add(e_prime);
    }
    
    // "add e to the queue"
    this.pq.enqueue(e, e.order);
  }

  delete(v_or_e){
    //console.log(`Dynamic Matching ${this.id} deleting ${v_or_e}`);

    if(v_or_e instanceof Vertex){
      var vertex = v_or_e;
      return this.delete_vertex(vertex);
    }

    if(v_or_e instanceof Edge){
      var edge = v_or_e;
      return this.delete_edge(edge);
    }
    
    return v_or_e;
  }

  delete_vertex(v){
    [...v.edges].map(e => this.delete(this.get_corresponding(e)));
    this.V.delete(v);
  }

  delete_edge(e){
    // "If e is in the matching, then unmatch(e)"
    var e_prime = [...this.E].find(e_prime => {
      var v1_prime = e_prime.source;
      var v2_prime = e_prime.target;
      return v1_prime.has(e.source) 
        && v2_prime.has(e.target);
    });

    if(e_prime){
      this.unmatch(e);
      
      e_prime.count--;
      if(e_prime.count == 0){
        this.delete(e_prime);
      }

      console.log(`${e}>${e.source}>${e.source.edges.size} E`);
      if(e.source.edges.size == 0){
        this.delete(this.get_corresponding(e.source));
      }
      
      console.log(`${e}>${e.target}>${e.target.edges.size} E`);
      if(e.target.edges.size == 0){
        this.delete(this.get_corresponding(e.target));
      }
    }

    [...this.E]
    .filter(edge => this.depends(e, edge))
    .map(edge => this.pq.enqueue(edge, edge.order));
  }

  depends(e1, e2){
    // "e1 -> e2 === (e1 < e2) and e1 S e2"
    var priority = e1.order < e2.order;
    var share_vertex = e1.shares_vertex(e2);

    return priority && share_vertex;
  }
  
  match(e){
    console.assert(e instanceof Edge, `DM::match didn't receive a Edge`);
    console.assert(e.source instanceof Vertex, `DM::match received a Edge but it doesn't have a Vertex as source`);
    console.assert(e.target instanceof Vertex, `DM::match received a Edge but it doesn't have a Vertex as target`);
    
    console.log(`DM#${this.id} matching ${e}`);

    // For each edge e' where e -> e', if e' is matched then
    // unmatch(e').
    [...this.E]
    .filter(e2 => this.depends(e, e2) && this.get_corresponding(e2))
    .map(e2 => this.unmatch(e2));
    
    // Delete vertices v1_coarse and v2_coarse from the coarser graph.
    var v1_prime = this.get_corresponding(e.source);
    var v2_prime = this.get_corresponding(e.target);
    this.delete(v1_prime);
    this.delete(v2_prime);

    // Create a new vertex v1 U v2 in G'. 
    var v1_u_v2 = new DMVertex(e.source, e.target);
    this.add(v1_u_v2);

    // For all edges e = (v, v') in G incident on v1 or v2
    // (but not both), add a corresponding edge to or from v1 U v2
    // in G'.
    [...e.source.edges]
    .filter(edge => edge != e)
    .map(edge => {
      var other_vertex = new DMVertex(edge.source);
      var corresponding_edge = new DMEdge(other_vertex, v1_u_v2);
      this.add(other_vertex);
      this.add(corresponding_edge);
    });
    [...e.target.edges]
    .filter(edge => edge != e)
    .map(edge => {
      var other_vertex = new DMVertex(edge.target);
      var corresponding_edge = new DMEdge(v1_u_v2, other_vertex);
      this.add(other_vertex);
      this.add(corresponding_edge);
    });

    [...this.E]
    .filter(edge => this.depends(edge, e))
    .map(edge => this.pq.enqueue(edge, edge.order));
  }

  unmatch(e){
    console.log(`DM ${this.id} unmatching ${e}`);

    // "Delete any edges in G' incident on v1_u_v2."
    var v1_u_v2 = this.get_corresponding(e.source);
    console.assert(v1_u_v2, `v1_u_v2 not found`)
    console.assert(v1_u_v2 == this.get_corresponding(e.target), `sanity`);

    [...v1_u_v2.edges]
    .map(incident_edge => this.delete(incident_edge));

    
    // "Delete the vertex v1_u_v2 from G'"
    this.delete(v1_or_v2);
    
    // "Add new vertices v1_prime and v2_prime to G'"
    this.V.set(e.source, new DMVertex(e.source));
    this.V.set(e.target, new DMVertex(e.target));
    
    // "For each edge incident on v1 or v2 in G add a corresponding edge to G'"
    [...e.source.edges]
    .map(edge => this.add(new DMEdge(
      this.get_corresponding(e.source),
      this.get_corresponding(edge.source == e.source ? edge.target : edge.source)
    )));
    [...e.target.edges]
    .map(edge => this.add(new DMEdge(
      this.get_corresponding(e.target),
      this.get_corresponding(edge.target == e.target ? edge.source : edge.target)
    )));

    // "For each e' such that e -> e', add e' to the queue."
    [...this.E]
    .filter(edge => this.depends(e, edge))
    .map(edge => this.pq.enqueue(edge, edge.order));
  }

  match_equation(e){
    if(this.E.size == 0){
      console.log('because empty');
      return true;
    }
    
    // "... e is matched if and only if there is no edge e' element M
    // such that e' -> e."
    var m = [...this.E]
    .every(edge => !this.depends(edge, e));
    this.m.set(e, m);

    return m;
  }

  process_queue(){
    while(!this.pq.empty()){
      var e = this.pq.dequeue();
      console.assert(e instanceof Edge, `pq didn't return an Edge`);
      var m = this.match_equation(e);
      if(m != this.m.get(e)){
        if(m){
          this.match(e);
        }else{
          this.unmatch(e);
        }
      }
    }
  }

  toString(){
    return `DynamicMatching#${this.id}{|V|:${this.V.size},|E|:${this.E.size}}`;
  }
  
  get size(){
    return this.E.size + this.V.size;
  }
  
  get complexity(){
    return this.V.size / this.E.size;
  }
}
DynamicMatching.id = 0;

/**
 * Graph|DynamicMatching coarser(Graph, Integer)
 * 
 * Retrieves the dynamic matching at the specified level, 
 * or the graph if supplied a level value of zero. 
 */
function coarser(base, level){
  if(level){
    return coarser(base.coarser, --level);
  }
  return base
}


  var BHN3 = function(){
    this.inners = [];
    this.outers = {};
    this.center_sum = new THREE.Vector3(0, 0, 0);
    this.center_count = 0;
    this.temperature = 0.000;

    return this;
  };

  BHN3.prototype.constants = CONSTANTS.BHN3;

  BHN3.prototype.center = function(){
    return this.center_sum.clone().divideScalar(this.center_count);
  };

  BHN3.prototype.place_inner = function(vertex){
    this.inners.push(vertex);
    this.center_sum.add(vertex.object.position);
    this.center_count += 1;
  };

  BHN3.prototype.get_octant = function(position){
    var center = this.center();
    var x = center.x < position.x ? 'l' : 'r';
    var y = center.y < position.y ? 'u' : 'd';
    var z = center.z < position.z ? 'i' : 'o';
    return x + y + z;
  };

  BHN3.prototype.place_outer = function(vertex){
    var octant = this.get_octant(vertex.object.position);
    this.outers[octant] = this.outers[octant] || new BHN3();
    this.outers[octant].insert(vertex);
  };

  BHN3.prototype.insert = function(vertex){
    if(this.inners.length === 0){
      this.place_inner(vertex);
    }else{
      if(this.center().distanceTo(vertex.object.position) <= this.constants.inner_distance){
        this.place_inner(vertex);
      }else{
        this.place_outer(vertex);
      }
    }
  };

  BHN3.prototype.estimate = function(vertex, force, force_fn){
    if(this.inners.indexOf(vertex) > -1){
      for(var i=0; i<this.inners.length; i++){
        if(vertex !== this.inners[i]){
          var individual_force = force_fn(
            vertex.object.position.clone(),
            this.inners[i].object.position.clone()
          );
    
          this.temperature += individual_force.lengthSq();
          force.add(individual_force);
        }
      }
    }else{
      var sumstimate = force_fn(vertex.object.position, this.center());
      sumstimate.multiplyScalar(this.center_count);
      this.temperature += sumstimate.lengthSq();
      force.add(sumstimate);
    }
    
    for(var octant in this.outers){
      this.outers[octant].estimate(vertex, force, force_fn);
      this.temperature += this.outers[octant].temperature;
    }
  };

  BHN3.prototype.pairwise_repulsion = function( x1, x2 ){

    var enumerator1, denominator1, 
      enumerator2, denominator2, 
      repulsion_constant, 
      difference, absolute_difference, 
      epsilon, product, 
      term1, term2,
      square, sum, result; 
    
    // first term
    enumerator1 = repulsion_constant = CONSTANTS.BHN3.repulsion;
    
    difference = x1.clone().sub(x2.clone());
    absolute_difference = difference.length();
    
    epsilon = CONSTANTS.BHN3.epsilon;
    sum = epsilon + absolute_difference;
    denominator1 = square = sum*sum;
    
    term1 = enumerator1 / denominator1;
    
    // second term
    enumerator2 = difference;
    denominator2 = absolute_difference;
    term2 = enumerator2.divideScalar(denominator2);
    result = term2.multiplyScalar(term1);

    return result;
  };
  
  var edges = false;
  Graph.prototype.layout = function(){
    this.temperature = 0.00;

    if(this.coarser){
      this.layout.call(this.coarser)
    }else{
    }

    // calculate repulsions
    var tree = new BHN3();
    var vertex, edge, v, e;

    this.V.forEach(vertex => {
      vertex.acceleration = this.coarser ? this.coarser.get_corresponding_vertex(vertex).acceleration.clone() : new THREE.Vector3();
      vertex.repulsion_forces = new THREE.Vector3();
      vertex.attraction_forces = new THREE.Vector3();
      tree.insert(vertex);
    })

    this.V.forEach(vertex => {
      vertex.repulsion_forces = new THREE.Vector3();
      tree.estimate(
        vertex,
        vertex.repulsion_forces,
        BHN3.prototype.pairwise_repulsion
      )
    });
    
    this.temperature = (tree.temperature / this.V.size);
    // calculate attractions

    this.E.forEach(edge => {
      var attraction = edge.source.object.position.clone().sub(
        edge.target.object.position
      );
      attraction.multiplyScalar(-1 * CONSTANTS.attraction);

      if(edge.options.directed){
        var distance = edge.object.geometry.vertices[0].distanceTo(edge.object.geometry.vertices[1]);
        var gravity = new THREE.Vector3(0.0, CONSTANTS.gravity/distance, 0.0);
        attraction.add(gravity);
      }
      
      edge.source.attraction_forces.sub(attraction);
      edge.target.attraction_forces.add(attraction);
    })
    
    for(e in this.E){
      edge = this.E[e];
      
      var attraction = edge.source.object.position.clone().sub(
        edge.target.object.position
      );
      attraction.multiplyScalar(-1 * CONSTANTS.attraction);

      // attraction.multiplyScalar(edge.options.strength);

      if(edge.options.directed){
        var distance = edge.object.geometry.vertices[0].distanceTo(edge.object.geometry.vertices[1]);
        var gravity = new THREE.Vector3(0.0, CONSTANTS.gravity/distance, 0.0);
        attraction.add(gravity);
      }
      
      edge.source.attraction_forces.sub(attraction);
      edge.target.attraction_forces.add(attraction);
    }
    
    this.V.forEach(vertex => {
      var friction = vertex.velocity.multiplyScalar(CONSTANTS.friction);

      vertex.acceleration.add(
        vertex.repulsion_forces.clone().add(
          vertex.attraction_forces.clone().negate()
        )
      )
      vertex.acceleration.sub(friction);
      vertex.velocity.add(vertex.acceleration);
      vertex.object.position.add(vertex.velocity);
    });

    this.E.forEach(edge => {
      edge.object.geometry.dirty = true;
      edge.object.geometry.__dirty = true;
      edge.object.geometry.verticesNeedUpdate = true;
    })

    this.center = tree.center();
    this.temperature = tree.temperature;
  };
	
	Graph.prototype.add_cycle = function(vertex_options){
		var vertices = [];
		var edges = [];
		for(var i=0; i<vertex_options.length; i++){
			vertices.push(this.add_vertex(vertex_options[i]));
			if(i>0){
				edges.push(this.add_edge(vertices[i-1], vertices[i]));
			}
		}
		edges.push(this.add_edge(vertices[0], vertices[vertices.length-1]));
		
		return {
			vertices: vertices,
			edges: edges
		};
	};
	
	Graph.prototype.remove_cycle = function(cycle){
		for(var i=0; i<cycle.edges.length; i++){
			this.remove_edge(cycle.edges[i]);
		}
		for(var i=0; i<cycle.vertices.length; i++){
			this.remove_vertex(cycle.vertices[i]);
		}
	};

	this.select = function(vertex){
		if(!vertex) return;
		
		if(that.selected){
			that.graph.remove_edge(that.camera_edge);
			delete that.camera_edge;
			that.graph.remove_vertex(that.camera_vertex);
			delete that.camera_vertex;
		}
		
		var camera = that._internals.camera;
		that.camera_vertex = that.graph.add_camera_vertex(camera);
		that.camera_edge = that.graph.add_invisible_edge(vertex, that.camera_vertex);
		that.selected = vertex;
	};
	
	this.deselect = function(){
    if(that.selected){
      
      that.graph.remove_edge(that.camera_edge);
      delete that.camera_edge;
      that.graph.remove_vertex(that.camera_vertex);
      delete that.camera_vertex;
      that.selected = null;
    }
	}
  
  this._internals = {};
  var scene,
      element,
      camera,
      light,
      renderer,
      graph,
      controls,
      clock, 
      raycaster,
      mouse,
      intersects,
      render_loop = [];
      
  var statistics = function(graph){
    return {
      t:  Date.now(),
      graph: {
        V: graph.V.size,
        E: graph.E.size,
        T: graph.temperature,
      },
      coarser: {
        V: graph.coarser.V.size,
        E: graph.coarser.E.size,
        T: graph.coarser.temperature
      }
    }
  }
      
  var old_intersects,
      old_color;
  var that = this;
  var render = function render(){
    requestAnimationFrame(render);

    if(graph.changed || graph.temperature > 0.00025){
      graph.layout();
    } 
    controls.update(clock.getDelta());
    
    for(var i=0; i<that.render_loop.length; i++){
      that.render_loop[i]();
    }
      
    if(that.selected){
      camera.lookAt(that.selected.position);
    }

    for(var i=0; i<Label.all.length; i++){
      Label.all[i].updatePosition(camera);
    }
    
    renderer.render(scene, camera);
  };

  var clear = function clear(){
    graph.clear();
  };
  
  // api
  this.init = function(selector, options){
    var settings = $.extend({
      border: 'none',
      width: 500,
      height: 250,
      background: null,
    }, options);
    
    scene = new THREE.Scene();
    if(typeof selector === "string"){
      element = document.querySelector(selector);
    }else{
      element = selector;
    }
    if(!element){
      throw "element " + selector + " wasn't found on the page.";
    }
    
    $(element).css({
      border: 0,
      margin: 0,
      padding: 0
    });
    $(element).width(settings.width);
    $(element).height(settings.height);
    
    camera = new THREE.PerspectiveCamera(
      70,
      settings.width / settings.height,
      1,
      CONSTANTS.far
    );
    light = new THREE.PointLight( 0xf0f0f0 ); // soft white light
    
    CONSTANTS.scene = scene;
    scene.add( camera );
    scene.add( light );

    /*
    if(options.background){
      scene.background = new THREE.TextureLoader().load(options.background);
    }
    */
    
    renderer = new THREE.WebGLRenderer({alpha: options.background === null});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize( settings.width, settings.height );
    
    $(element).append( renderer.domElement );
    $(renderer.domElement).css({
      margin: 0,
      padding: 0,
      border: settings.border
    })
    
    graph = new Graph(scene);
    new DynamicMatching(graph, 0);
    
    camera.position.z = -250;
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    
    THREEx.WindowResize(renderer, camera);

    clock = new THREE.Clock();
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.update(clock.getDelta()); 
    controls.movementSpeed = 250;
    controls.domElement = renderer.domElement;
    controls.rollSpeed = Math.PI / 12;
    controls.autoForward = false;
    controls.dragToLook = true;
    
    that.intersect_callback = function(object){
      console.log(object.vertex);
    };

    that.resolve_click = function(event){
      if(event.target === renderer.domElement){
        var raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();
        mouse.x = ( event.clientX / renderer.domElement.width ) * 2 - 1;
        mouse.y = - ( event.clientY / renderer.domElement.height ) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        intersects = raycaster.intersectObjects(scene.children, true);

        if(intersects.length > 0){
          return intersects[0].object.vertex;
        }else{
          return null;
        }
      }
    };
    
    var onMouseDown = function(event){
      if(event.target === renderer.domElement){
        var raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();
        mouse.x = ( event.clientX / renderer.domElement.width ) * 2 - 1;
        mouse.y = - ( event.clientY / renderer.domElement.height ) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        intersects = raycaster.intersectObjects(scene.children, true);

        if(that.on_mouse_down instanceof Function){
          if(intersects.length > 0){
            that.on_mouse_down(intersects[0].object.vertex);
          }else{
            that.on_mouse_down(null);
          }
        }
        
        if(intersects.length > 0){
          that.selected = intersects[0].vertex;
        }
        
        if(intersects.length > 0 && typeof that.intersect_callback == 'function'){
          that.intersect_callback(intersects[0].object, event);
        }
      }
    }
    $(element).on('mousedown', onMouseDown);
    
    that._internals = {
      scene: scene,
      element: element,
      camera: camera,
      light: light,
      renderer: renderer,
      graph: graph,
      controls: controls,
      clock: clock, 
      raycaster: raycaster,
      mouse: mouse,
    
      Vertex: Vertex,
      Edge: Edge,
      CameraVertex: CameraVertex,
      BHN3: BHN3,
    };

    this.graph = graph;
    this.render = render;
    this.clear = clear;
		this.render_loop = render_loop;
    this.variables = CONSTANTS;

    /**
     * element choice(iterable)
     *
     * Returns a pseudorandom element from the iterable by converting it 
     * to an array and choosing a random element. 
     */
    var choice = function(iterable){
      var arr = [...iterable];
      return arr[Math.floor(arr.length*Math.random())];
    }

    /**
     * randomize(graph, v, e)
     * 
     * adds the specified number of vertices (v) and edges (e) to the graph. 
     */
    this.randomize = (v, e) => {
      for(var i=0; i<v; i++){
        this.graph.add_vertex({cube: {size: 10, color: Math.floor(0xffffff*Math.random())}});
      }
      
      for(var i=0; i<e; i++){
        this.graph.add_edge(choice(this.graph.V.values()), choice(this.graph.V.values()));
      }
      
      return graph;
    }

    render();
  };

  // untested
  this.setCubeFn = function(fn){
    cube = fn;
  };

  this.setLineFn = function(fn){
    line = fn;
  };
  // end untested
  
  return this;
};
