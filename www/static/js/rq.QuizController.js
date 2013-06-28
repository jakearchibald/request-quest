(function() {
  function QuizController() {
    var quizController = this;

    quizController.ready_ = rq.getJson('quiz-data.json').then(function(data) {
      quizController.model_ = new rq.QuizModel(data);
      quizController.questionControllers_ = quizController.model_.questions.map(function(question) {
        var ui = new rq.QuestionUi();
        var questionController = new rq.QuestionController(question, ui);
        ui.setQuestionTotal(quizController.model_.questions.length);
        questionController.on('continue', quizController.nextQuestion_.bind(quizController));
        questionController.on('phaseAnswered', function(event) {
          if (event.wasCorrect) {
            quizController.model_.score++;
            quizController.ui_.score(quizController.model_.score);
          }
        });
        return new rq.QuestionController(question, ui);
      });

      var questionUis = quizController.questionControllers_.map(function(x) { return x.ui; });

      quizController.ui_ = new rq.QuizUi(questionUis);

      quizController.ui_.on('startQuizBtnSelected', function() {
        quizController.ui_.prepareScreen().then(
          quizController.nextQuestion_.bind(quizController)
        );
      });
      quizController.ui_.on('resetSelected', quizController.reset_.bind(quizController));
    });
    quizController.questionNum_ = -1;
  }

  var QuizControllerProto = QuizController.prototype;

  QuizControllerProto.start = function() {
    var quizController = this;
    quizController.ready_.done(function() {
      quizController.ui_.score(quizController.model_.score);
      quizController.ui_.showIntro();
    });
  };

  QuizControllerProto.reset_ = function() {
    window.location.reload();
  };

  QuizControllerProto.nextQuestion_ = function() {
    var quizController = this;

    Q.resolve().then(function() {
      if (quizController.questionNum_ > -1) {
        return quizController.ui_.destroyQuestion(quizController.questionNum_);
      }
    }).then(function() {
      quizController.questionNum_++;
      var questionController = quizController.questionControllers_[quizController.questionNum_];

      if (questionController) {
        quizController.ui_.showQuestion(quizController.questionNum_);
        questionController.start();
      }
      else {
        quizController.results_();
      }
    });
  };

  QuizControllerProto.results_ = function() {
    this.ui_.showFinalResults(this.model_.score, this.model_.maxScore);
  };

  rq.QuizController = QuizController;
}());