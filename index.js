var fs = require('fs');
var path = require('path');
var express = require('express');
var app = express();

app.use('/static', express.static(__dirname + '/www/static'));

//app.set('json spaces', 0);

app.get('/', function(req, res) {
  res.set({
    'Cache-Control': 'no-cache'
  });
  res.sendfile('www/index.html');
});

var triggerPhase;
var lastPhaseId;
var questionSpecs = [];
var questionDirs = [
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
  triggerPhase = {};
  questionDirs.forEach(function(questionDir) {
    triggerPhase[questionDir] = 0;
  });
}

initTestResults();

questionDirs.forEach(function(dir) {
  // get test data
  var spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'www', 'questions', dir, 'spec.json')));
  var lastPhase;

  // save it for creating quiz data
  spec.id = dir;
  questionSpecs.push(spec);

  // serve json
  app.get('/questions/' + dir + '/spec.json', function(req, res) {
    res.set({
      'Cache-Control': 'no-cache'
    });
    res.json(spec);
  });

  // serve expected file
  if (spec.expectedRequest != '#') {
    app.get('/questions/' + dir + '/' + spec.expectedRequest, function(req, res) {
      res.set({
        'Cache-Control': 'no-cache'
      });

      triggerPhase[dir] = Number(lastPhase);
      res.sendfile(path.join('www', 'questions', dir, spec.expectedRequest));
    });
  }

  // serve test page
  app.get('/questions/' + dir + '/test', function(req, res) {
    res.set({
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    });

    var phase = req.query.phase;
    var phaseId = dir + phase;
    var content = '<!doctype html><html><head><meta charset=utf-8></head><body>';
    var lines = [];

    // We assume the a test will never request the same dir & phase combo
    // unless it's requesting the source to display as part of the test
    if ((!phase || phaseId == lastPhaseId) && !req.xhr) {
      // were we expecting that?
      if (spec.expectedRequest === '#') {
        triggerPhase[dir] = Number(lastPhase);
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
    lastPhase = phase;
  });
});

app.get('/trigger-phases.json', function(req, res) {
  res.set({
    'Cache-Control': 'no-cache'
  });
  res.json(triggerPhase || {});
});

app.get('/question-dirs.json', function(req, res) {
  res.set({
    'Cache-Control': 'no-cache'
  });
  res.json(questionDirs);
});

app.get('/quiz-data.json', function(req, res) {
  res.set({
    'Cache-Control': 'no-cache'
  });

  fs.readFile(path.join(__dirname, 'www', 'results.json'), function (err, data) {
    if (err) throw err;
    var results = JSON.parse(data);
    questionSpecs.forEach(function(questionSpec) {
      questionSpec.answer = {};
      for (var browser in results) {
        questionSpec.answer[browser] = results[browser][questionSpec.id];
      }
    });
    res.json(questionSpecs);
  });

});

app.get('/test/', function(req, res) {
  initTestResults();
  res.set({
    'Cache-Control': 'no-cache'
  });
  res.sendfile('www/tester.html');
});

module.exports = app.listen(3000);