(function() {
  function QuestionController(questionModel, quizUi) {
    var questionController = this;
    questionController.listeners_ = [];
    questionController.phase_ = -1;
    questionController.ui_ = quizUi;
    questionController.model_ = questionModel;

    // user has finished reading the solution and wants to continue
    questionController.uiOn_('continueBtnSelected', questionController.end_.bind(questionController));
    
    questionController.uiOn_('answerYes', function() {
      questionModel.answerRemaining(questionController.phase_);
      questionController.showAnswer_();
      questionController.trigger('answerGiven');
    });

    questionController.uiOn_('answerNo', function() {
      questionController.nextPhase_();
      questionController.trigger('answerGiven');
    });

    // User wants to decide on particular browsers
    questionController.uiOn_('answerSome', function() {
      quizUi.showBrowserChoices(questionModel.remainingBrowsers());
    });

    // User selected particular browsers
    questionController.uiOn_('answerThose', function(browsers) {
      questionModel.answer(questionController.phase_, browsers);
      if (questionModel.answered()) {
        questionController.showAnswer_();
      }
      else {
        questionController.nextPhase_();
      }

      questionController.trigger('answerGiven');
    });
  }

  var QuestionControllerProto = QuestionController.prototype = Object.create(rq.EventEmitter.prototype);

  QuestionControllerProto.start = function() {
    this.ui_.showQuestion(this.model_.title, this.model_.subtitle);
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
    this.ui_.showAnswer(this.model_.title, this.model_.score, this.model_.answerBreakdown(), this.model_.explanation);
  };

  QuestionControllerProto.end_ = function() {
    this.removeUiListeners_();
    this.trigger('continue');
    this.off(); // remove all listeners to clean up
  };

  rq.QuestionController = QuestionController;
})();