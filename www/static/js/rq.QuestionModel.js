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

    this.browserAnswer = data.answer;
    this.playerAnswer = {};
    this.score = 0;
    this.explanation = data.explanation;
  }

  var QuestionModelProto = QuestionModel.prototype;

  QuestionModelProto.answer = function(phaseNum, browsers) {
    var questionModel = this;
    // set answer for each phaseNum
    // phaseNum should be -1 to mean "does not request"
    browsers.forEach(function(browser) {
      questionModel.playerAnswer[browser] = phaseNum;
    });

    questionModel.calcScore_();
  };

  QuestionModelProto.calcScore_ = function() {
    // recalculate score
    this.score = 0;

    for (var browser in this.browserAnswer) {
      if (this.browserAnswer[browser] == this.playerAnswer[browser]) {
        this.score++;
      }
    }
  };

  QuestionModelProto.passRemaining = function() {
    var questionModel = this;

    questionModel.remainingBrowsers().forEach(function(browser) {
      questionModel.playerAnswer[browser] = -1;
    });
    questionModel.calcScore_();
  };

  QuestionModelProto.answerRemaining = function(phaseNum) {
    var questionModel = this;

    questionModel.remainingBrowsers().forEach(function(browser) {
      questionModel.playerAnswer[browser] = phaseNum;
    });
    questionModel.calcScore_();
  };

  QuestionModelProto.remainingBrowsers = function() {
    var browsers = [];

    for (var browser in this.browserAnswer) {
      if (!(browser in this.playerAnswer)) {
        browsers.push(browser);
      }
    }
    return browsers;
  };

  QuestionModelProto.answered = function() {
    // is the question fully answered or passed?
    for (var browser in this.browserAnswer) {
      if (!(browser in this.playerAnswer)) {
        return false;
      }
    }
    return true;
  };

  rq.QuestionModel = QuestionModel;
})();