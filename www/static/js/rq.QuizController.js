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
    var quizController = this;
    var question = quizController.model_.questions[quizController.questionNum];
    var questionController = new rq.QuestionController(question, quizController.ui_);
    questionController.start();
    
    // wait for QuestionController to fire 'continue'
    // if has nextquestion nextQuestion_
    // else results_
  };

  QuizControllerProto.results_ = function() {
    // tell UI to show results & score
  };

  rq.QuizController = QuizController;
}());