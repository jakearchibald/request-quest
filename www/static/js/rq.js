var rq = {};

rq.get = function(url) {
  var deferred = Q.defer();
  var req = new XMLHttpRequest();
  
  req.open('get', url);
  req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
  
  req.addEventListener('load', function() {
    deferred.resolve(req);
  });

  req.addEventListener('error', function() {
    deferred.reject(req);
  });

  req.send();
  return deferred.promise;
};

rq.getJson = function(url) {
  return rq.get(url).then(function(req) {
    return JSON.parse(req.responseText);
  });
};