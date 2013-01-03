(function() {
  function QuestionModel(data) {
    this.title = data.title;
    this.subtitle = data.subtitle;
    this.lang = data.lang;

    var lines = [];
    this.phases = data.phases.map(function(phase) {
      if (phase.removeLines) {
        lines.splice(-phase.removeLines);
      }
      if (phase.addLines) {
        lines.push.apply(lines, phase.addLines);
      }
      return lines.join('\n');
    });

    this.answer = data.answer;
    this.playerAnswer = data.playerAnswer;
    this.score = 0;
    this.explanation = data.explanation;
  }

  var QuestionModelProto = QuestionModel.prototype;

  QuestionModelProto.answer = function(phaseNum, browsers) {
    var questionModel = this;
    // set answer for each phaseNum
    // phaseNum should be 0 to mean "does not request"
    browsers.forEach(function(browser) {
      questionModel.playerAnswer[browser] = phaseNum;
    });

    // recalculate score
    questionModel.score = 0;

    for (var browser in questionModel.answer) {
      if (questionModel.answer[browser] == questionModel.playerAnswer[browser]) {
        questionModel.score++;
      }
    }
  };

  QuestionModelProto.passRemaining = function() {
    // for any browser without an answer, set its phase to 0
    for (var browser in this.answer) {
      if (!(browser in this.playerAnswer)) {
        this.playerAnswer[browser] = 0;
      }
    }
  };

  QuestionModelProto.answered = function() {
    // is the question fully answered or passed?
    for (var browser in this.answer) {
      if (!(browser in this.playerAnswer)) {
        return false;
      }
    }
    return true;
  };

  rq.QuestionModel = QuestionModel;
})();