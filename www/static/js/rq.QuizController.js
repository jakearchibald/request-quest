(function() {
  function QuizController() {
    var quizController = this;

    quizController.ready_ = rq.getJson('quiz-data.json').then(function(data) {
      quizController.model_ = new rq.QuizModel(data);
      quizController.ui_ = new rq.QuizUi();

      quizController.gameInProgress_ = quizController.model_.load();

      // user wants to start the quiz
      quizController.ui_.on('startQuizBtnSelected', quizController.nextQuestion_.bind(quizController));
      quizController.ui_.on('restartQuizBtnSelected', function() {
        quizController.model_.reset();
        quizController.nextQuestion_();
      });
    });

    quizController.questionNum_ = -1;
    quizController.gameInProgress_ = false;
  }

  var QuizControllerProto = QuizController.prototype;

  QuizControllerProto.start = function() {
    var quizController = this;
    quizController.ready_.done(function() {
      quizController.ui_.showIntro(quizController.gameInProgress_);
    });
  };

  QuizControllerProto.nextQuestion_ = function() {
    this.questionNum_++;
    this.model_.save();

    var question = this.model_.questions[this.questionNum_];

    if (!question) {
      this.results_();
      return;
    }

    if (question.answered()) {
      this.nextQuestion_();
      return;
    }

    var questionController = new rq.QuestionController(question, this.ui_);
    questionController.on('continue', this.nextQuestion_.bind(this));
    questionController.on('answerGiven', this.model_.save.bind(this.model_));
    questionController.start();
  };

  QuizControllerProto.results_ = function() {
    this.ui_.showFinalResults(this.model_.score, this.model_.maxScore);
  };

  rq.QuizController = QuizController;
}());