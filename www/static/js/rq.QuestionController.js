(function() {
  function QuestionController(model, ui) {
    var questionController = this;
    questionController.listeners_ = [];
    questionController.phase_ = -1;
    questionController.ui = ui;
    questionController.model_ = model;

    ui.setQuestion(model.num, model.title, model.requestDesc);

    questionController.ui.on('answerYes', function() {
      questionController.handleAnswer_(true);
    });

    questionController.ui.on('answerNo', function() {
      questionController.handleAnswer_(false);
    });

    questionController.ui.on('continue', function() {
      questionController.nextPhase_();
    });

    questionController.nextPhase_();
  }

  var QuestionControllerProto = QuestionController.prototype = Object.create(rq.EventEmitter.prototype);

  QuestionControllerProto.start = function() {
    this.ui.setInteractivity(true);
  };

  QuestionControllerProto.handleAnswer_ = function(userAnswer) {
    var browsers = this.model_.browsersForPhase(this.phase_);
    var makesRequest = !!browsers.length;
    var wasCorrect = makesRequest == userAnswer;

    this.trigger('phaseAnswered', {
      wasCorrect: wasCorrect
    });

    this.ui.showAnswer(wasCorrect, browsers, this.model_.phases[this.phase_].explanation);
  };

  QuestionControllerProto.nextPhase_ = function() {
    this.phase_++;
    var phaseObj = this.model_.phases[this.phase_];

    if (phaseObj) {
      if (this.phase_) {
        this.ui.continueQuestion(this.model_.langClass, phaseObj.code);
      }
      else {
        this.ui.showPhaseCode(this.model_.langClass, phaseObj.code);
      }
    }
    else {
      // no phases left
      this.end_();
    }
  };

  QuestionControllerProto.end_ = function() {
    this.trigger('continue');
    this.ui.setInteractivity(false);
  };

  rq.QuestionController = QuestionController;
})();