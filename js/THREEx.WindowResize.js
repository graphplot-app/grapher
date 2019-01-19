var THREEx = THREEx || {};

THREEx.WindowResize = function(renderer, camera, width, height){

  var resolve = function(option, def){
    if(option instanceof Function){
      return option();
    }else if(option !== undefined){
      return option;
    }else{
      return def;
    }
  };

	var callback = function(){
    renderer.setSize(
      resolve(width, window.innerWidth), 
      resolve(height, window.innerHeight)
    );
    camera.aspect = resolve(width, window.innerWidth) / resolve(height, window.innerHeight);
    camera.updateProjectionMatrix();
  }
  
  window.addEventListener('resize', callback, false);
  
  return {
    stop: function(){
      window.removeEventListener('resize', callback);
    }
  }
}