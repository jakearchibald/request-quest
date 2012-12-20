var rq = {};

rq.getJson = function(url) {
  var deferred = Q.defer();
  var req = new XMLHttpRequest();
  
  req.open('get', url);
  
  req.addEventListener('load', function() {
    deferred.resolve(JSON.parse(req.responseText));
  });

  req.addEventListener('error', function() {
    deferred.reject(req);
  });

  req.send();
  return deferred.promise;
};