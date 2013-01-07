(function() {
  function QuizController() {
    var quizController = this;

    quizController.ready_ = rq.getJson('quiz-data.json').then(function(data) {
      quizController.model_ = new rq.QuizModel(data);
      quizController.ui_ = new rq.QuizUi();

      // user wants to start the quiz
      quizController.ui_.on('startBtnSelected', quizController.nextQuestion_.bind(quizController));
    });

    quizController.questionNum = -1;
  }

  var QuizControllerProto = QuizController.prototype;

  QuizControllerProto.start = function() {
    var quizController = this;
    quizController.ready_.done(function() {
      quizController.ui_.showIntro();
    });
  };

  QuizControllerProto.nextQuestion_ = function() {
    this.questionNum++;
    var question = this.model_.questions[this.questionNum];

    if (!question) {
      this.results_();
      return;
    }

    var questionController = new rq.QuestionController(question, this.ui_);
    questionController.on('continue', this.nextQuestion_.bind(this));
    questionController.start();
  };

  QuizControllerProto.results_ = function() {
    this.ui_.showFinalResults(this.model_.score, this.model_.maxScore);
  };

  rq.QuizController = QuizController;
}());