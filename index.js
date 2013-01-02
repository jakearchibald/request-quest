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
var lastPhaseId;
var testDirs = [
  'img-element',
  'divbg-element',
  'script-element',
  'script-add',
  'iframe-element',
  'script-comment',
  'img-add',
  'divbg-add',
  'style-add',
  'webfont-range',
  'resize-reload'
];

function initTestResults() {
  lastPhaseId = '';
  requestByTest = {};
}

initTestResults();

testDirs.forEach(function(dir) {
  // get test data
  var spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'www', dir, 'spec.json')));
  var phase;

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

      requestByTest[dir] = phase;
      res.sendfile(path.join('www', dir, spec.expectedRequest));
    });
  }

  // serve test page
  app.get('/' + dir + '/test', function(req, res) {
    res.set({
      'Content-Type': 'text/html',
      'Cache-Control': 'no-Cache'
    });

    phase = req.query.phase;
    var phaseId = dir + phase;
    var content = '<!doctype html><html><head><meta charset=utf-8></head><body>';
    var lines = [];

    // We assume the a test will never request the same dir & phase combo
    // unless it's requesting the source to display as part of the test
    if ((!phase || phaseId == lastPhaseId) && !req.xhr) {
      // were we expecting that?
      if (spec.expectedRequest === '#') {
        requestByTest[dir] = phase;
      }
      else {
        console.log("Unexpected request back to test page");
      }
      res.send('Oh hello.');
      return;
    }

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
    lastPhaseId = phaseId;
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