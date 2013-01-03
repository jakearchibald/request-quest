(function() {
  function QuestionController(questionModel, quizUi) {
    var questionController = this;
    questionController.phase_ = -1;
    questionController.ui_ = quizUi;
    questionController.model_ = questionModel;

    // user has finished reading the solution and wants to continue
    quizUi.on('continueBtnSelected', questionController.end_.bind(questionController));
    
    quizUi.on('answerYes', function() {
      questionModel.answerRemaining(questionController.phase_);
      questionController.showAnswer_();
    });

    quizUi.on('answerNo', function() {
      questionController.nextPhase_();
    });

    // User wants to decide on particular browsers
    quizUi.on('answerSome', function() {
      quizUi.showBrowserChoices(questionModel.remainingBrowsers());
    });

    // User selected particular browsers
    quizUi.on('answerThose', function(browsers) {
      questionModel.answer(questionController.phase_, browsers);
      if (questionModel.answered()) {
        questionController.showAnswer_();
      }
      else {
        questionController.nextPhase_();
      }
    });
  }

  var QuestionControllerProto = QuestionController.prototype = Object.create(rq.EventEmitter.prototype);

  QuestionControllerProto.start = function() {
    this.ui_.showQuestion(this.model_.title, this.model_.subtitle);
    this.nextPhase_();
  };

  QuestionControllerProto.nextPhase_ = function() {
    this.phase_++;
    var phaseCode = this.model_.phases[this.phase_];

    if (phaseCode) {
      this.ui_.showPhaseCode(this.model_.phases[this.phase_]);
    }
    else {
      // no phases left
      this.showAnswer_();
    }
  };

  QuestionControllerProto.showAnswer_ = function() {
    // quizUi.showAnswer
    console.log('TODO: show answer');
  };

  QuestionControllerProto.end_ = function() {
    // remove listeners
    // fire event
    console.log('TODO: end question');
  };

  rq.QuestionController = QuestionController;
})();