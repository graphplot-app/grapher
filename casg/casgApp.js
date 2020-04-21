var casgApp = angular.module('casgApp', ['ngRoute', 'ngSanitize', 'ui.bootstrap']);

// https://stackoverflow.com/a/2117523/11169288
function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

class PGPLoader {
  constructor(){
    this.privateKey = null;
  }

  async setKey(privateKeyArmored, passphrase){
    this.privateKeyArmored = privateKeyArmored;
    this.passphrase = passphrase;

    if(!privateKeyArmored === this.privateKeyArmored){
      return;
    }

    this.privateKey = null;
    const { keys: [privateKey] } = await openpgp.key.readArmored(this.privateKeyArmored);
    if(privateKey){
      this.privateKey = privateKey;
      try{
        this.privateKey.decrypt(this.passphrase);
      }catch(e){
        throw "Wrong Password";
      }
    }
  }

  async unsetKey(){
    this.privateKey = null;
    this.privateKeyArmored = null;
    this.passphrase = null;
  }

  /*
    Precondition:
    - setKey(...) has been called

    Postcondition: 
    - None

    Arguments: 
    - text: string
    - to: array of armored key strings, or single armored key

    Return value:
    - encrypted string
  */
  async encrypt(text, to){
    if(!this.privateKey){
      console.error("Please call setKey(...) first")
      return;
    }

    if(to instanceof Array){
      var publicKeys = await Promise.all(to.map(async key => {
        return (await openpgp.key.readArmored(key)).keys[0];
      }));
    }else{
      var publicKeys = (await openpgp.key.readArmored(to)).keys[0];
    }

    var { data: encrypted } = await openpgp.encrypt({
      message: openpgp.message.fromText(text),
      publicKeys,
      privateKeys: [this.privateKey]
    })

    return encrypted;
  }

  /*
    Precondition:
    - setKey(...) has been called

    Postcondition: 
    - None

    Arguments:
    - encrypted: string of encrypted text
    - senderPublicKey: the public key of the sender

    Return value:
    - decrypted text string
  */
  async decrypt(encrypted, senderPublicKey){
    var {data: decrypted} = await openpgp.decrypt({
      message: await openpgp.message.readArmored(encrypted),
      publicKeys: (await openpgp.key.readArmored(senderPublicKey)).keys[0],
      privateKeys: [this.privateKey]
    })

    return decrypted;
  }
}

/*
  There is a time and a place for everything.
  Even global variables. 
*/
const pgp = new PGPLoader();

var KeyPairs = {
  name: 'keyPairs',
  builder: function(privateClient, publicClient){    
    var client = privateClient;

    client.declareType('casg-keypair', {
      'type': 'object',
      'properties': {
        'title': {
          'type': 'string',
          'default': 'Untitled Key Pair'
        },
        'privateKeyArmored': {
          'type': 'string'
        },
        'publicKeyArmored': {
          'type': 'string'
        },
        'revocationCertificate': {
          'type': 'string'
        }
      },
      'required': ['title', 'privateKeyArmored', 'publicKeyArmored', 'revocationCertificate']
    });

    return {
      exports: {

        list: async function(){
          return await new Promise((resolve, reject) => {  
            client.getAll('', false).then(objects => resolve(Object.keys(objects).map((key) => {
              this._augment(objects[key], key);
              return objects[key];
            })))
          });
        },

        store: function(keyPair){
          var file = uuidv4();
          var path = `${file}`;
          client.storeObject('casg-keypair', path, keyPair);
          this._augment(keyPair, path);

          return keyPair;
        },

        _augmentPGP: function(lio){
          Object.assign(lio, {
            encrypt: async function(text, to){
              return await pgp.encrypt(text, to);
            },
  
            decrypt: async function(ciphertext, from){
              return await pgp.decrypt(ciphertext, from);
            }
          });
        },

        _augmentIO: function(lio, li){
          Object.assign(lio, {
            remove: function(){
              client.remove(li);
            }
          });

          return lio;
        },

        _augment: function(lio, li){
          this._augmentPGP(lio);
          this._augmentIO(lio, li);
          Object.assign(lio, {
            name: li
          });

          return lio;
        },

        create: async function(name, email, phrase){
          var privateKey = await openpgp.generateKey({ 
            curve: 'curve25519',  
            userIds: [{ 
              'name': name,
              'email': email
            }],
            'passphrase': phrase
          });          
          privateKey.title = `${name} <${email}>`;

          return await this.store(privateKey)
        }
      }
    }
  }
};

var OwnPublicKeys = {
  name: 'ownPublicKeys',
  builder: function(privateClient, publicClient){
    var client = publicClient;

    client.declareType('casg-ownpublickey', {
      'type': 'object',
      'properties': {
        'title': {
          'type': 'string',
          'default': 'Untitled Public Key'
        },
        'publicKeyArmored': {
          'type': 'string'
        },
        'publicUrl': {
          'type': 'string'
        }
      },
      'required': ['title', 'publicKeyArmored']
    });

    return {
      exports: {
        list: async function(){
          return await new Promise((resolve, reject) => {  
            client.getAll('', false).then(objects => resolve(Object.keys(objects).map((key) => {
              this._augment(objects[key], key);
              objects[key].publicUrl = client.getItemURL(key);
              return objects[key];
            })))
          });
        },

        isShared: function(keyPair){
          var path = keyPair.name;
          var url = client.getItemUrl(path);
          console.log(url);

          keyPair.publicUrl = url;
          return url;
        },

        share: function(keyPair){
          var path = `${keyPair.name}`;
          var publicKey = {
            title: keyPair.title,
            publicKeyArmored: keyPair.publicKeyArmored
          };

          return new Promise((resolve, reject) => {  
            client.storeObject('casg-ownpublickey', path, publicKey).then(() => {

              var url = client.getItemURL(path);
              keyPair.publicUrl = url;
    
              this._augment(publicKey, path);
              publicKey.publicUrl = url;
              client.storeObject('casg-ownpublickey', path, publicKey);
              resolve(publicKey);
            })
          })
        },

        _augmentIO: function(lio, li){
          Object.assign(lio, {
            remove: function(){
              client.remove(li);
            }
          });

          return lio;
        },

        _augment: function(lio, li){
          this._augmentIO(lio, li);
          Object.assign(lio, {
            name: li
          });

          lio.publicUrl = client.getItemURL(li)

          return lio;
        }
      }
    }
  }
};

var OthersPublicKeys = {
  name: 'othersPublicKeys',
  builder: function(privateClient, publicClient){
    var client = privateClient;

    client.declareType('casg-otherspublickey', {
      'type': 'object',
      'properties': {
        'title': {
          'type': 'string',
          'default': 'Untitled Public Key'
        },
        'publicKeyArmored': {
          'type': 'string'
        }
      },
      'required': ['title', 'publicKeyArmored']
    });
    

    return {
      exports: {
        list: async function(){
          return await new Promise((resolve, reject) => {  
            client.getAll('', false).then(objects => resolve(Object.keys(objects).map((key) => {
              this._augment(objects[key], key);
              return objects[key];
            })))
          });
        },

        import: async function(url){
          return await new Promise((resolve, reject) => {
            $.getJSON(url, {}, (data) => {
              var file = uuidv4();
              var path = `${file}`;

              var key = {
                title: data.title,
                publicKeyArmored: data.publicKeyArmored
              };
              this._augment(key, path);
              client.storeObject('casg-otherspublickey', path, key);
              resolve(key);
            });
          })
        },

        _augmentIO: function(lio, li){
          lio.remove = function(){
            return client.remove(li);
          }

          return lio;
        },

        _augment: function(lio, li){
          this._augmentIO(lio, li);
          lio.name = li;
          return lio;
        }
      }
    }
  }
};

var Graphs = {
  name: 'graphs',
  builder: function(privateClient, publicClient){
    var client = privateClient;

    privateClient.declareType('casg-graph', {
      'type': 'object',
      'properties': {
        'title': {
          'type': 'string',
          'default': 'Untitled Graph'
        },

        'description': {
          'type': 'string',
          'default': ''
        },

        'commands': {
          'type': 'array',
          'default': []
        }

      },
      'required': ['title']
    });

    return {
      exports: {
        list: async function(keyPair){
          return await new Promise((resolve, reject) => {  
            client.getAll('', false).then(objects => {
              Promise.all(Object.keys(objects).map(async (listing) => {
                var graph = await this.load(listing, keyPair)
                this._augment(graph, listing);
                return graph;
              }))
            }).then(resolve);
          });
        },

        storeGraph: async function(keyPair, graph){   

          var title = graph.title;
          var encryptedGraphContent = await keyPair.encrypt(
            JSON.stringify(graph),
            [keyPair.publicKeyArmored]
          );

          console.log(encryptedGraphContent);

          await privateClient.storeFile('text/plain', title, encryptedGraphContent.toString());
          return graph;
        },

        load: async function(listing, keyPair){
          return new Promise((resolve, reject) => {
            privateClient.getFile(listing).then(file => {
              var blob = new Blob([file.data], { type: file.mimeType });
              const reader = new FileReader();
              reader.addEventListener('loadend', async () => {
                keyPair.decrypt(reader.result, keyPair.publicKeyArmored).then(async graphString => {
                  if(graphString){
                    var graph = JSON.parse(graphString);
                    await this._augment(graph, listing);
                    resolve(graph);
                  }else{
                    reject("Could not decrypt graph with supplied key!");
                  }
                }, reject);
              });
              reader.readAsText(blob);
            })
          });
        },

        _augmentIO: (lio, li) => {
          lio.update = function(keyPair){
            client.storeGraph(keyPair, this);
          };

          lio.remove = function(){
            client.remove(li);
          };

          lio.share = async function(privateKey, to, phrase){
            // privateKey
            var encrypted = privateKey.encrypt(JSON.stringify({
              title: lio.title,
              description: lio.description, 
              commands: lio.commands
            }), privateKey.privateKeyAromred, to, phrase);

            // publicClient
            var path = `${uuidv4}`;
            
            await publicClient.storeFile('text/plain', path, encrypted)
            var url = publicClient.getItemURL(path);
            console.log(url)

            return url;
          };
        },

        _augment: function(lio, li){
          this._augmentIO(lio, li);
          lio.name = li;
          lio.title = li;
        },

        create: async function(keyPair, title, description='', commands=[]){
          var graph = {
            'title': title,
            'description': description,
            'commands': commands
          };

          await this.storeGraph(keyPair, graph);
          this._augment(graph, title);
          return graph;
        }
      }
    }
  }
};

var Counter = function*(){
  var i=0;
  while(true){
    yield i++;
  }
}

var MainCtrl = casgApp.controller('MainCtrl', ['$scope', '$http', '$location', async function($scope, $http, $location){
  // RemoteStorage Variables and Functions
  $('[data-toggle="tooltip"]').tooltip();
  $scope.currentKeyPair = null;
  $scope.graphs = [];

  $scope.initFourD = function(){

    if($scope.$fourd){
      delete $scope.$fourd;
    }

    var $display = $('#display');
    $scope.$fourd = new FourD();
    $scope.$fourd.init($display, {
      border: '1px solid 0x007bff',
      width: $display.width(),
      height: $display.height(),
      background: 0xffffff
    });
  }
  $scope.initFourD();

  $scope.setCurrentKeyPair = async function(keyPair){
    if(keyPair === null){
      pgp.unsetKey();
      $scope.currentKeyPair = null;
      return;
    }

    var phrase = prompt(`${keyPair.title}'s Passphrase?`);
    try{
      await pgp.setKey(keyPair.privateKeyArmored, phrase)
      $scope.currentKeyPair = keyPair;
    }catch(e){
      alert('Opening Key failed!')
    }
    $scope.$apply();

    $scope.loadGraphs();
  }

  $scope.RS = new RemoteStorage({
    modules: [ KeyPairs, OwnPublicKeys, OthersPublicKeys, Graphs ],
    cache: true,
    changeEvents: {
      local:    true,
      window:   true,
      remote:   true,
      conflict: true
    },
    logging: false
  });

  // Public Key Infrastructure
  $scope.keyPairs = [];
  $scope.ownPublicKeys = [];
  $scope.othersPublicKeys = [];
  $scope.selectedPublicKeys = {};

  $scope.RS.on('ready', async function(){
    $scope.RS.access.claim('keyPairs', 'rw');
    $scope.RS.access.claim('ownPublicKeys', 'rw');
    $scope.RS.access.claim('othersPublicKeys', 'rw');
    $scope.RS.access.claim('graphs', 'rw');
    $scope.RS.access.claim('public', 'rw');

    $scope.RS.caching.enable('/keyPairs/');
    $scope.RS.caching.enable('/ownPublicKeys/');
    $scope.RS.caching.enable('/othersPublicKeys/');
    $scope.RS.caching.enable('/graphs/');
    $scope.RS.caching.enable('/public/');

    $scope.RS.caching.set('/keyPairs/', 'ALL');
    $scope.RS.caching.set('/ownPublicKeys/', 'ALL');
    $scope.RS.caching.set('/othersPublicKeys/', 'ALL');
    $scope.RS.caching.set('/graphs/', 'ALL');
    $scope.RS.caching.set('/public/', 'ALL');

    $scope.keyPairs = await $scope.RS.keyPairs.list();
    $scope.ownPublicKeys = await $scope.RS.ownPublicKeys.list();
    $scope.othersPublicKeys = await $scope.RS.othersPublicKeys.list();
    $scope.$apply();
  });

  $scope.RS.on('connected', async function(){
    $scope.RS.startSync();
    $scope.keyPairs = await $scope.RS.keyPairs.list();
    $scope.ownPublicKeys = await $scope.RS.ownPublicKeys.list();
    $scope.othersPublicKeys = await $scope.RS.othersPublicKeys.list();
    $scope.othersPublicKeys.forEach(publicKey => {
      $scope.selectedPublicKeys[publicKey] = false;
    })

    $scope.$apply();
  })

  $scope.clearStorage = function(){
    var ok = confirm("This will delete all storage!!! All Storage!!! Continue?");
    if(!ok){
      return;
    }

    var c = $scope.RS.scope('/');
    c.getListing('/', false).then(listing => {
      if(!listing){
        return;
      }

      Object.keys(listing).forEach(li => {
        c.remove(li);
      });
    });
    
    $scope.RS.caching.reset();
  }

  clearStorage = $scope.clearStorage;
  
  $scope.RS.on('network-offline', () => {
    console.debug(`We're offline now.`);
  });
  
  $scope.RS.on('network-online', () => {
    console.debug(`Hooray, we're back online.`);
  });

  $scope.RS.on('disconnected', () => {
    console.debug('disconnected');
  });

  $scope.storageWidget = new Widget($scope.RS, {leaveOpen: true, skipInitial: true});
  $scope.configureStorage = function(){
    if(document.querySelector('remote-storage-configuration>*') == undefined){
      $scope.storageWidget.attach('remote-storage-configuration');
    }
  }

  // OpenPGP.js Variables and Functions

  $scope.namePrompt = "Please enter your name for the key pair: ";
  $scope.emailPrompt = "Please enter your email for the key pair: ";
  $scope.phrasePrompt = "Please enter a passphrase for the key pair: ";

  $scope.generateKeyPair = async function(){
    /*
    var confirmation = confirm("Creating a new Key Pair means you will re-encrypt all files and shares. Would you like to continue?")
    if(!confirmation){
      console.error('aborted');
      return;
    }
    */

    var name = prompt($scope.namePrompt);
    if(!name){
      console.error('aborted');
      return;
    }

    var email = prompt($scope.emailPrompt);
    if(!email){
      console.error('aborted');
      return;
    }

    var phrase = prompt($scope.phrasePrompt)
    if(!phrase){
      console.error('aborted');
      return;
    }
    
    var keyPair = await $scope.RS.keyPairs.create(name, email, phrase);
    $scope.keyPairs.push(keyPair);
    $scope.$apply();
  }

  $scope.exportToDevice = function(privateKey){
    var link = document.createElement('a');
    
    link.download = `${privateKey.title}.keypair.json`;

    var keyData = JSON.stringify(privateKey);
    var data = `data:text/json;charset=utf-8,${encodeURIComponent(keyData)}`;
    link.href = data;

    link.click();
  }

  $scope.exportToWeb = async function(keyPair){
    var publicKey = await $scope.RS.ownPublicKeys.share(keyPair);
    $scope.ownPublicKeys.push(publicKey);
    $scope.$apply();
  }

  $scope.importKeyPair = function(){
    var f = document.querySelector('#key-pair-upload').files[0]
    var r = new FileReader();

    r.onload = async function(e){
      var data = e.target.result;
      var privateKey = JSON.parse(data);

      var keyPair = $scope.RS.keyPairs.store(privateKey);
      $scope.keyPairs.push(keyPair);

      $scope.showKeyPairUpload = false;
      $scope.$apply();
    }

    r.readAsText(f);
  }

  $scope.removeKeyPair = async function(keyPair){
    keyPair.remove();
    delete $scope.keyPairs[$scope.keyPairs.indexOf(keyPair)];

    // $scope.$apply();
  }

  $scope.removePublicKeyListing = async function(key){
    key.remove();
    delete $scope.ownPublicKeys[$scope.ownPublicKeys.indexOf(key)];

    // $scope.$apply();
  }

  $scope.sharePublicKey = async function(key){
    var confirmation = confirm("Sharing your public key will share your name and email address, making it discoverable on the web. Please confirm you want to do that...");
    if(!confirmation){
      console.error('aborted');
      return;
    }

    var publicKey = await $scope.RS.ownPublicKeys.share(key);
    $scope.ownPublicKeys.push(publicKey);
    $scope.$apply();
    return url;
  };

  $scope.importPublicKey = async function(){
    var url = prompt('Public Key URL');
    if(!url){
      console.error('aborted');
      return;
    }
    
    var publicKey = await $scope.RS.othersPublicKeys.import(url);
    if(publicKey){
      $scope.othersPublicKeys.push(publicKey);
      $scope.selectedPublicKeys[publicKey] = false;
      $scope.$apply();
    }
  }

  $scope.clearKeyPairs = function(){
    $scope.keyPairs.forEach(keyPair => {
      keyPair.remove();
    });

    $scope.$apply();
  }

  $scope.clearAll = function(){
    $scope.remoteStorage.disconnect();
  }

  $scope.removeOthersPublicKey = async function(publicKey){
    publicKey.remove();
    delete $scope.othersPublicKeys[$scope.othersPublicKeys.indexOf(publicKey)];
  }

  $scope.clearGraph = function(){

    $('.text-label').remove();

    delete $scope.Role.all;
    $scope.Role.all = [];

    delete $scope.Person.all;
    $scope.Person.all = [];

    delete $scope.Group.all;
    $scope.Group.all = [];

    delete $scope.Entity.all;
    $scope.Entity.all = [];

    $scope.edges.forEach(edge => $scope.removeEdge(edge))
    delete $scope.edges;
    $scope.edges = [];
  
    $scope.vertices.forEach(vertex => $scope.removeVertex(vertex));
    delete $scope.vertices;
    $scope.vertices = [];

    if(!$scope.$fourd){
      return;
    }


    $scope.$fourd.clear();

    $scope.Entity.id = 0;
  }

  $scope.createGraph = async function(){
    if($scope.$fourd){
      $scope.clearGraph();
    }else{
      $scope.initFourD();
    }

    if($scope.keyPairs.length == 0){
      alert('Please create a key pair first, and activate it by clicking the lock and confirming the passphrase.');
      return;
    }

    var name = prompt("Graph Name: ");
    if(!name){
      console.debug('aborted');
      return;
    }

    if($scope.currentKeyPair === null && confirm('Load First Key Pair?')){
      $scope.setCurrentKeyPair($scope.keyPairs[0]);
    }

    $scope.currentGraph = $scope.RS.graphs.create(
      $scope.currentKeyPair,
      name
    );
    $scope.currentGraph.title = name;
    $scope.currentGraph.commands = [];
    await $scope.RS.graphs.storeGraph($scope.currentKeyPair, $scope.currentGraph);

    $scope.graphs.push($scope.currentGraph);
    $scope.$apply();

    return $scope.currentGraph;
  }

  $scope.cloneGraph = async function(graph){
    if($scope.keyPairs.length == 0){
      alert('Please create a key pair first, and activate it by clicking the lock and confirming the passphrase.');
      return;
    }

    var newName = prompt("New File Name");
    if(!newName){
      console.debug("aborted");
      return;
    }

    if($scope.currentKeyPair === null && confirm("Load First Key Pair?")){
      $scope.setCurrentKeyPair($scope.keyPairs[0]);
    }

    $scope.currentGraph = $scope.RS.graphs.create(
      $scope.currentKeyPair,
      newName
    )

    $scope.currentGraph.title = newName;
    $scope.currentGraph.commands = graph.commands;
    await $scope.RS.graphs.storeGraph($scope.currentKeyPair, $scope.currentGraph);

    $scope.graphs.push($scope.currentGraph);
    $scope.$apply();

    return $scope.currentGraph;
  }

  $scope.downloadGraph = function(graph){
    var link = document.createElement('a');
    link.download = `${graph.title}.graph.pgp.txt`;

    var client = $scope.RS.scope('/graphs/');
    client.getFile(graph.title).then(file => {
      var blob = new Blob([file.data], { type: file.mimeType });
      const reader = new FileReader();
      reader.addEventListener('loadend', async () => {
        var textData = reader.result;

        var data = `data:text/json;charset=utf-8,${encodeURIComponent(textData)}`;
        link.href = data;

        link.click();
      });
      reader.readAsText(blob);
    })
  }


  $scope.importGraph = function(){
    var f = document.querySelector('#graph-upload').files[0];
    var title = prompt("File Name?")
    var r = new FileReader();

    r.onload = async function(e){
      var encrypted = e.target.result;
      var client = $scope.RS.scope('/graphs/');
      
      await client.storeFile('text/plain', title, encrypted);

      $scope.RS.graphs
      .load(title, $scope.currentKeyPair)
      .then(graph => {
        $scope.graphs.push(graph);
      }, (reason) => {
        $scope.graphs.push({title, reason})
      })

      $scope.showGraphUpload = false;
      $scope.$apply();
    }

    r.readAsText(f);
  }

  $scope.vertices = [];
  $scope.edges = [];

  $scope.addVertex = function(){
    var label = prompt('Label?');
    if(!label){
      var vertex = $scope.$fourd.graph.add_vertex({
        'cube': {size: 10, color: 0x000000}
      })
    }else{
      var vertex = $scope.$fourd.graph.add_vertex({
        'cube': {size: 10, color: 0x000000}, 
        'label': {offset: 10, text: label}
      });
    }

    $scope.vertices.push(vertex);
    return vertex;
  }

  $scope.addEdge = function(source=null, target=null){
    if(source === null){
      var source = prompt('Source ID?');
      if(!source){
        console.debug('aborted');
        return;
      }
    }

    if(target === null){
      var target = prompt('Target ID?');
      if(!target){
        console.debug('aborted');
        return;
      }
    }

    var edge = $scope.$fourd.graph.add_edge(source, target, {directed: true});

    edge.title = `(${source}, ${target})`;

    $scope.edges.push(edge);
    return edge;
  }

  $scope.removeVertex = function(vertex){
    vertex.remove();
    $scope.$fourd.graph.remove_vertex(vertex)
    delete $scope.vertices[$scope.vertices.indexOf(vertex)];
  }

  $scope.removeEdge = function(edge){
    if(edge){
      $scope.$fourd.graph.remove_edge(edge);
      delete $scope.edges[$scope.edges.indexOf(edge)]
    }
  }

  $scope.removeGraph = function(graph){
    var client = $scope.RS.scope('/graphs/');
    client.remove(graph.title)
    
    if(graph == $scope.currentGraph){
      $scope.currentGraph = null;
      delete $scope.graphs[$scope.graphs.indexOf(graph)];
    }

    $scope.$apply();
  }

  $scope.loadGraphs = async function(){

    if($scope.keyPairs.length == 0){
      alert('Please create a key pair first, and activate it by clicking the lock and confirming the passphrase.');
      return;
    }

    if(!$scope.currentKeyPair){
      return;
    }

    var c = $scope.RS.scope('/graphs/');
    c.getListing('', false).then(async listing => {
      console.log('listing', listing);
      if(!listing){
        return;
      }

      $scope.graphs = await Promise.all(
        Object.keys(listing).map(async li => {
          return new Promise((resolve, reject) => {
            $scope.RS.graphs
            .load(li, $scope.currentKeyPair)
            .then(graph => {
              resolve(graph);
              return graph;
            }, (reason) => {
              resolve({title: li, reason: reason})
            })
          })
        }
      ))

      console.log($scope.graphs);
      $scope.$apply();
    })
  }

  $scope.saveGraph = function(){
    $scope.RS.graphs.storeGraph($scope.currentKeyPair, $scope.currentGraph);
  }

  $scope.gatherAndProcess = function(){

    var commandPrompt = `Command:`;

    var command = prompt(commandPrompt);
    if(command){
      $scope.currentGraph.commands.push(command);
      $scope.process(command);
    }else{
      console.debug('aborted');
    }
  }

  $scope.playGraph = function(graph){
    if($scope.$fourd){
      $scope.clearGraph();
    }else{
      $scope.initFourD();
    }
    $scope.currentGraph = graph;

    $scope.currentGraph.commands.forEach(async command => {
      $scope.process(command);
      await new Promise((resolve, reject) => {
        setTimeout(resolve, 250)
      })
    });
  }

  /*
    Social Cartography
  */

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
      // $('#display').social_cartography(undos[event.command], event.id);

      // $scope[undos[event.command], event.id];
      // future.unshift(event.command, event.info);
    }else{
      console.log('history empty.');
    }
  }

  future.redo = function(){
    // var event = this.shift();
    if(event){
      // $('#display').social_cartography(event.command, event.info);
      // 
    }
  }

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
    
    switch(typeof info.sub){
      case 'number':
        this.sub = $scope.Entity.all.find(p => p.id == info.sub);
        break;
      case 'string':
        this.sub = $scope.Entity.all.find(p => p.name == info.sub);
        break;
      case 'object':
        this.sub = info.sub;
        break;
      default:
        this.sub = info.sub;
    }

    switch(typeof info.super){
      case 'number':
        this.super = $scope.Entity.all.find(e => e.id == info.super);
        break;
      case 'string':
        this.super = $scope.Entity.all.find(e => e.name == info.super);
        break;
      case 'object':
        this.super = info.super;
        break;
      default:
        this.super = info.super;
    }

    this.name = `${this.sub.name}@${this.super.name}`;
    this.from = new Date(info.from);
    this.until = new Date(info.until);
    this.texture = info.texture;

    this.vertex = $scope.$fourd.graph.add_vertex({
      cube: {size: 5, color: 0x000000}, 
      label: {offset: 10, text: this.name}
    });

    this.vertex.entity = this;

    this.sub_edge = $scope.$fourd.graph.add_edge(this.vertex, this.sub.vertex, {directed: true});
    this.super_edge = $scope.$fourd.graph.add_edge(this.super.vertex, this.vertex, {directed: true});

    this.sub.roles.add(this);
    this.super.roles.add(this);


    return this;
  }
  $scope.Role.all = [];

  $scope.Role.prototype.toJSON = function(){
    return {
      id: this.id,
      sub: this.sub.id,
      super: this.super.id,
      name: this.name,
      from: this.from.to_normal(),
      until: this.until.to_normal(),
      texture: this.texture
    };
  };

  $scope.Role.prototype.set = function(options){
    this.id = options.id !== undefined ? options.id : $scope.Entity.id++;
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
    this.id = info.id !== undefined ? info.id : $scope.Entity.id++;
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
        color: 0x000000
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

  $scope.Group = function(info){
    this.options = info;
    this.id = info.id !== undefined ? info.id : $scope.Entity.id++;
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
        color: 0x000000
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

  $scope.add_person = function(info, id_callback){
    person = new $scope.Person(info);
    
    person.options = info;
    history.push({command: 'add_person', info: person.options, id: person.id});
    if(typeof id_callback == 'function') id_callback(person.id);

    return person;
  },
  
  $scope.remove_person = function(id){
    var index = -1;
    var person = $scope.Person.all.find(function(value, idx){
      if(value.id === id){
        index = idx;
        return true;
      }

      return false;
    });

    if(person){
      [...person.roles].forEach(role => $scope.remove_role(role.id)); // this might be wrong, sociologically speaking... do roles exist after the person has left?

      $scope.$fourd.graph.remove_vertex(person.vertex);
      $scope.Person.all.splice(index, 1);
    }

    $scope.Entity.all.splice($scope.Entity.all.findIndex(e => e.id == id));    
  };
  
  $scope.add_group = function(info, id_callback){
    group = new $scope.Group(info);

    group.options = info;
    history.push({command: 'add_group', info: group.options, id: group.id});
    if(typeof id_callback == 'function') id_callback(group.id)
    
    return group;
  },
  
  $scope.remove_group = function(id){
    var index = -1;
    var group = $scope.Group.all.find(function(value, idx){
      if(value.id === id){
        index = idx;
        return true;
      }

      return false;
    });

    if(group){
      [...group.roles].forEach(role => $scope.remove_role(role.id));

      $scope.$fourd.graph.remove_vertex(group.vertex);
      $scope.Group.all.splice(index, 1);
    }
    $scope.Entity.all.splice($scope.Entity.all.findIndex(e => e.id == id));
  };

  $scope.add_role = function(info, id_callback){
      
    console.assert(info.sub !== undefined, 'info.sub must be defined');
    console.assert(info.super !== undefined, 'info.super must be defined');
    console.log(info)

    switch(typeof info.sub){
      case 'number':
        info.sub = $scope.Entity.all.find(p => p.id == info.sub);
        break;

      case 'string':
        info.sub = $scope.Entity.all.find(p => p.name == info.sub);
        break;

      case 'object':
        if(!info.sub.vertex){
          info.sub = this.add_person(info.sub);
        }
        break;
    }

    switch(typeof info.super){
      case 'number':
        info.super = $scope.Entity.all.find(e => e.id == info.super);
        break;

      case 'string':
        info.super = $scope.Entity.all.find(g => g.name == info.super);
        break;

      case 'object':
        if(!info.super.vertex){
          info.super = $scope.add_person(info.super);
        }
    }

    var role = new $scope.Role(info); // creates its own vertex, incosistent with Person and Group!!!
    if(typeof id_callback == 'function') id_callback(role.id);

    // history
    role.info = {sub: person, super: group};

    role.sub.roles.add(this);
    role.super.roles.add(this);
    // history.push({command: 'add_role', info: role.info, id: role.id});
    return role;
  };

  $scope.remove_role = function(id){
    var index = -1;
    var role = $scope.Role.all.find(function(val, idx){
      if(val.id === id){
        index = idx;
        return true;
      }

      return false;
    });

    if(role){
      $scope.removeEdge(role.sub_edge);
      $scope.removeEdge(role.super_edge);

      $scope.$fourd.graph.remove_vertex(role.vertex);
      $scope.Role.all.splice(index, 1);
    
      $scope.Entity.all.splice($scope.Entity.all.findIndex(e => e.id == id));
      return true;
    }
  };

  var that = this;
  $scope.process = function(input){
    if(!input){
      input = prompt("Input").toString();
      if(!input){
        return;
      }
    }

    var grammar = /^(.+)|(.+)((\> | \@ | \<) .+)?$/g;
    var command = input.match(grammar)[0];

    var parts;
    if(command.indexOf('@') > -1){
      parts = command.split('@');
    }else if(command.indexOf('>') > -1){
      parts = command.split('>');
    }else if(command.indexOf('<') > -1){
      parts = command.split('<');
    }else{
      parts = [command];
    }

    console.log('parts', parts);
  
    var sub_name = parts[0];

    if(parts.length == 1){
      $scope.add_person({name: parts[0], color: 0x000000})
      return;
    }

    var super_name = parts[1];
    var sub_component;
    var super_component;

    
    // search persons, then groups
    try{
      sub_component = $scope.Person.all.find(p => p.name == sub_name);

      if(sub_component === undefined){
        sub_component = $scope.add_person({name: sub_name, color: 0x000000});
      }
    }catch(e){
      console.error(e);
      return;
    }


    try{
      super_component = $scope.Person.all.find(g => g.name == super_name);
      if(super_component === undefined){
        super_component = $scope.Person.all.find(g => g.name == super_name);
      }
      if(super_component === undefined && super_name){
        super_component = $scope.add_person({name: super_name, color: 0x000000});
      }
    }catch(e){
      console.error(e);
    }

    if(command.indexOf('@') > -1){
      /* Role Syntax */   
      var role = $scope.add_role({'sub': sub_component, 'super': super_component, color: 0x000000});
    }

    if(command.indexOf('>') > -1){
      $scope.$fourd.graph.add_edge(sub_component.vertex, super_component.vertex, {directed: true});
    }

    if(command.indexOf('<') > -1){
      $scope.$fourd.graph.add_edge(super_component.vertex, sub_component.vertex, {directed: true});
    }

    // this is an english error
    
  }

  $scope.removeEntity = function(entity){
    if($scope.Person.all.indexOf(entity) > -1){
      $scope.remove_person(entity.id);
    }

    if($scope.Group.all.indexOf(entity) > -1){
      $scope.remove_group(entity.id);
    }
  }

  $scope.removeCommand = function(commandIndex){
    delete $scope.currentGraph[commandIndex];
    $scope.currentGraph.commands.splice(commandIndex, 1);
  }

}]);

