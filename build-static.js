// All the files needed for the static version
var manifest = [
  '/',
  '/quiz-data.json',
  '/static/css/all.css',
  '/static/css/imgs/logos/chrome.png',
  '/static/css/imgs/logos/firefox.png',
  '/static/css/imgs/logos/ie9.png',
  '/static/css/imgs/logos/safari.png',
  '/static/css/imgs/padlock.png',
  '/static/css/fonts/akashi.ttf',
  '/static/js/all.js'
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

function del(paths) {
  paths.forEach(function(path) {
    if (fs.statSync(path).isDirectory()) { // recurse
      del(
        fs.readdirSync(path).map(function(file) {
          return path + '/' + file;
        })
      );
      fs.rmdirSync(path);
    }
    else {
      fs.unlinkSync(path);
    }
  });
}

module.exports = function(done) {
  mkdirDeep('build');

  // Remove everything within build except stuff beginning '.'
  // This allows the build dir to be a submodule
  del(
    fs.readdirSync('build').filter(function(file) {
      return file[0] != '.';
    }).map(function(file) {
      return 'build/' + file;
    })
  );

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

    staticFile.on('error', deferred.reject.bind(deferred));
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