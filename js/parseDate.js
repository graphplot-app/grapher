var parseDateIn = function(str){
  var doc = nlp(str);
  doc.normalize();
  
  try{
    var _in = doc.match('in #Value #Duration').out('tags');
    var val = parseFloat(_in.find(e => e.tags.indexOf('NumericValue') > -1).normal);
    var dur = _in.find(e => e.tags.indexOf('Duration') > -1).normal;
    // console.log(`in ${value} ${duration}`);

    return moment().add(val, dur).format('Y-MM-DD');
  }catch(TypeError){
    return undefined;
  }
}

var parseDateOnSimple = function(str){
  var doc = nlp(str);
  doc.normalize();
  
  try{
    var _in = doc.match('#Date').out('tags');
    return moment(_in[0].normal).format('YYYY-MM-DD');
  }catch(TypeError){
    return undefined;
  }
}

var parseDateOnLong = function(str){
  var doc = nlp(str);
  doc.normalize();
  
  try{
    var _in = doc.dates().out('tags');
    var month = _in.find(e => e.tags.indexOf('Month') > -1).normal;
    var day = parseFloat(_in.find(e => e.tags.indexOf('NumericValue') > -1).normal);
    var year = parseFloat(_in.find(e => e.tags.indexOf('Year') > -1).normal);
    
    var months = {
      'january': 1,
      'february': 2,
      'march': 3,
      'april': 4,
      'may': 5,
      'june': 6,
      'july': 7,
      'august': 8,
      'september': 9,
      'october': 10,
      'november': 11,
      'december': 12
    }
    
    return moment(`${year}-${months[month]}-${day}`).format('YYYY-MM-DD');
  }catch(TypeError){
    console.error('Parsing failed.')
    return undefined;
  }
}

var parseDateOn = function(str){
  try{
    var date = parseDateOnLong(str) || parseDateOnSimple(str)
    return date;
  }catch(TypeError){
    return undefined;
  }
}

var parseDateAgo = function(str){
  var doc = nlp(str);
  doc.normalize();
  
  try{
    var _in = doc.match('#Value #Duration ago').out('tags');
    var val = parseFloat(_in.find(e => e.tags.indexOf('NumericValue') > -1).normal);
    var dur = _in.find(e => e.tags.indexOf('Duration') > -1).normal;
    
    return moment().subtract(val, dur).format('Y-MM-DD');
  }catch(TypeError){
    return undefined;
  }
}

var parseDate = function(str){
  var doc = nlp(str);
  doc.normalize();
  var date;
  try{
    date = parseDateAgo(str) 
      || parseDateIn(str) 
      || parseDateOn(str);
  }catch(TypeError){
    date = doc.dates().out('tags');
  }
  
  return date;
}

