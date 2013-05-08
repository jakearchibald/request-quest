(function() {
  function QuestionModel(data) {
    this.id          = data.id;
    this.title       = data.title;
    this.lang        = data.lang;
    this.requestDesc = data.requestDesc || data.expectedRequest;

    // expand each of the phases
    var lines = [];
    this.phases = data.phases.map(function(phase) {
      if (phase.removeLines) {
        lines.splice(-phase.removeLines);
      }
      if (phase.addLines) {
        lines.push.apply(lines, phase.addLines);
      }
      return {
        code: lines.join('\n'),
        explanation: phase.explanation
      };
    });

    this.browserAnswer = data.answer;
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