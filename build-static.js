// All the files needed for the static version
var manifest = [
  // urls go here
];
var server = 'http://localhost:3000';

var fs = require('fs');
var path = require('path');
var http = require('http');
var Q = require('q');

function mkdirDeep(pathToMake) {
  return pathToMake.split('/').reduce(function(pathSoFar, nextPathPart) {
    pathSoFar = path.join(pathSoFar, nextPathPart);
    
    if (!fs.existsSync(pathSoFar)) {
      fs.mkdirSync(pathSoFar, 0755);
    }
    
    return pathSoFar;
  }, __dirname);
}

module.exports = function(done) {
  // remove current dir
  if (fs.existsSync('build')) {
    fs.rmdir('build');
  }

  mkdirDeep('build');

  var promises = manifest.map(function(urlPath) {
    var pathParts = urlPath.split('/').slice(1);
    var fileName = pathParts[pathParts.length - 1] || 'index.html';
    var dir = pathParts.slice(0, -1).join('/');
    var deferred = new Q.defer();

    if (dir) {
      mkdirDeep('build/' + dir);
    }

    var staticFile = fs.createWriteStream(path.join('build', dir, fileName), {
      flags: 'w',
      mode: 0644
    });

    staticFile.on('error', function(err) {
      deferred.reject(err);
    });

    staticFile.on('close', deferred.resolve.bind(deferred));

    http.get(server + urlPath, function(res) {
      res.pipe(staticFile);
    });

    return deferred.promise;
  });

  Q.all(promises).then(done, function(err) {
    throw err;
  });
};