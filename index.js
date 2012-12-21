var fs = require('fs');
var path = require('path');
var express = require('express');
var app = express();

app.use('/static', express.static(__dirname + '/www/static'));

app.get('/', function(req, res) {
  res.set({
    'Cache-Control': 'no-Cache'
  });
  res.sendfile('www/index.html');
});

// Testing:
var requestByTest;
var testDirs = [
  'img-element',
  'divbg-element',
  'script-element',
  'script-add',
  'iframe-element',
  'script-comment',
  'divbg-add'
];

function initTestResults() {
  requestByTest = {};
}

initTestResults();

testDirs.forEach(function(dir) {
  // get test data
  var spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'www', dir, 'spec.json')));

  // serve json
  app.get('/' + dir + '/spec.json', function(req, res) {
    res.set({
      'Cache-Control': 'no-Cache'
    });
    res.json(spec);
  });

  // serve expected file
  if (spec.expectedRequest != '#') {
    app.get('/' + dir + '/' + spec.expectedRequest, function(req, res) {
      res.set({
        'Cache-Control': 'no-Cache'
      });

      // todo: respond to any listening test console
      requestByTest[dir] = true;
      res.sendfile(path.join('www', dir, spec.expectedRequest));
    });
  }

  // serve test page
  app.get('/' + dir + '/test', function(req, res) {
    res.set({
      'Content-Type': 'text/html',
      'Cache-Control': 'no-Cache'
    });

    // Ohh, there's been a request back to ourself
    if (req.get('referrer') && req.get('referrer').slice('http://'.length).indexOf(req.get('host') + req.path) === 0) {
      // were we expecting that?
      if (spec.expectedRequest === '#') {
        requestByTest[dir] = true;
      }
      else {
        console.log("Unexpected request back to test page");
      }
      res.send('Hey there.');
      return;
    }

    var phase = req.query.phase;
    var content = '<!doctype html><html><head><meta charset=utf-8></head><body>';
    var lines = [];

    if (spec.lang === 'js') {
      content += '<script>';
    }

    spec.phases.slice(0, phase).forEach(function(phase) {
      if (phase.removeLines) {
        lines.splice(-phase.removeLines);
      }
      if (phase.addLines) {
        lines.push.apply(lines, phase.addLines);
      }
    });

    content += '\n' + lines.join('\n') + '\n';

    if (spec.lang === 'js') {
      content += '</script>';
    }

    content += '</body></html>';

    res.send(content);
  });
});

app.get('/request-by-test.json', function(req, res) {
  res.set({
    'Cache-Control': 'no-Cache'
  });
  res.json(requestByTest || {});
});

app.get('/test-dirs.json', function(req, res) {
  res.set({
    'Cache-Control': 'no-Cache'
  });
  res.json(testDirs);
});

app.get('/test/', function(req, res) {
  initTestResults();
  res.set({
    'Cache-Control': 'no-Cache'
  });
  res.sendfile('www/tester.html');
});

module.exports = app.listen(3000);