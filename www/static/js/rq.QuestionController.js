(function() {
  function QuestionController(questionModel, quizUi) {
    var questionController = this;
    questionController.listeners_ = [];
    questionController.phase_ = -1;
    questionController.ui_ = quizUi;
    questionController.model_ = questionModel;

    questionController.uiOn_('answerYes', function() {
      questionController.handleAnswer_(true);
    });

    questionController.uiOn_('answerNo', function() {
      questionController.handleAnswer_(false);
    });

    questionController.uiOn_('continue', function() {
      questionController.nextPhase_();
    });
  }

  var QuestionControllerProto = QuestionController.prototype = Object.create(rq.EventEmitter.prototype);

  QuestionControllerProto.start = function() {
    this.ui_.showQuestion(this.model_.title, this.model_.requestDesc);
    this.nextPhase_();
  };

  QuestionControllerProto.uiOn_ = function(type, func) {
    this.listeners_.push([type, func]);
    this.ui_.on(type, func);
  };

  QuestionControllerProto.removeUiListeners_ = function() {
    var questionController = this;
    questionController.listeners_.forEach(function(listener) {
      questionController.ui_.off(listener[0], listener[1]);
    });
  };

  QuestionControllerProto.handleAnswer_ = function(userAnswer) {
    var browsers = this.model_.browsersForPhase(this.phase_);
    var makesRequest = !!browsers.length;
    var wasCorrect = makesRequest == userAnswer;

    this.trigger('phaseAnswered', {
      wasCorrect: wasCorrect
    });

    this.ui_.showAnswer(wasCorrect, browsers, this.model_.phases[this.phase_].explanation);
  };

  QuestionControllerProto.nextPhase_ = function() {
    this.phase_++;
    var phaseObj = this.model_.phases[this.phase_];

    if (phaseObj) {
      this.ui_.showPhaseCode(phaseObj.code);
    }
    else {
      // no phases left
      this.end_();
    }
  };

  QuestionControllerProto.end_ = function() {
    this.removeUiListeners_();
    this.trigger('continue');
    this.off(); // remove all listeners to clean up
  };

  rq.QuestionController = QuestionController;
})();