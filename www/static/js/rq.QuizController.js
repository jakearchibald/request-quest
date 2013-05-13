(function() {
  function QuizController() {
    var quizController = this;

    quizController.ready_ = rq.getJson('quiz-data.json').then(function(data) {
      quizController.model_ = new rq.QuizModel(data);
      quizController.ui_ = new rq.QuizUi();

      quizController.ui_.on('startQuizBtnSelected', quizController.nextQuestion_.bind(quizController));
      quizController.ui_.on('resetSelected', quizController.reset_.bind(quizController));
      quizController.ui_.setQuestionTotal(quizController.model_.questions.length);
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
    this.questionNum_ = -1;
    this.model_.score = 0;
    this.start();
  };

  QuizControllerProto.nextQuestion_ = function() {
    var quizController = this;
    quizController.questionNum_++;

    var question = quizController.model_.questions[quizController.questionNum_];

    if (!question) {
      quizController.results_();
      return;
    }

    var questionController = new rq.QuestionController(question, quizController.ui_);
    questionController.on('continue', quizController.nextQuestion_.bind(quizController));
    questionController.on('phaseAnswered', function(event) {
      if (event.wasCorrect) {
        quizController.model_.score++;
        quizController.ui_.score(quizController.model_.score);
      }
    });
    questionController.start();
  };

  QuizControllerProto.results_ = function() {
    this.ui_.showFinalResults(this.model_.score, this.model_.maxScore);
  };

  rq.QuizController = QuizController;
}());