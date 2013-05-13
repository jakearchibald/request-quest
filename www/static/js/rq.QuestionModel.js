(function() {
  var formatMap = {
    js: 'javascript',
    html: 'xml',
    css: 'css'
  };

  function QuestionModel(num, data) {
    var questionModel = this;
    questionModel.num         = num;
    questionModel.id          = data.id;
    questionModel.title       = data.title;
    questionModel.lang        = data.lang;
    questionModel.langClass   = formatMap[data.lang];
    questionModel.requestDesc = data.requestDesc || data.expectedRequest;

    // expand each of the phases
    var lines = [];
    
    questionModel.phases = data.phases.map(function(phase) {
      if (phase.removeLines) {
        lines.splice(-phase.removeLines);
      }
      if (phase.addLines) {
        lines.push.apply(lines, phase.addLines);
      }
      return {
        code: hljs.highlight(formatMap[questionModel.lang], lines.join('\n')).value,
        explanation: phase.explanation
      };
    });

    questionModel.browserAnswer = data.answer;
  }

  var QuestionModelProto = QuestionModel.prototype;

  QuestionModelProto.browsersForPhase = function(phaseNum) {
    var questionModel = this;

    return Object.keys(questionModel.browserAnswer).filter(function(key) {
      return questionModel.browserAnswer[key] == phaseNum;
    });
  };

  rq.QuestionModel = QuestionModel;
})();