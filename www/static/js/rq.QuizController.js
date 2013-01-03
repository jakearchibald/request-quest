(function() {
  function QuizController() {
    var quizController = this;

    quizController.ready_ = rq.getJson('quiz-data.json').then(function(data) {
      quizController.model = new rq.QuizModel(data);
      quizController.ui = new rq.QuizUi();

      // user wants to start the quiz
      quizController.ui.on('startBtnSelected', quizController.nextQuestion_.bind(quizController));
    });
  }

  var QuizControllerProto = QuizController.prototype;

  QuizControllerProto.start = function() {
    var quizController = this;
    quizController.ready_.done(function() {
      quizController.ui.showIntro();
    });
  };

  QuizControllerProto.nextQuestion_ = function() {
    console.log('Showing question');
    // get next question model
    // create question controller
    // questionController.start()
    
    // wait for QuestionController to fire 'continue'
    // if has nextquestion nextQuestion_
    // else results_
  };

  QuizControllerProto.results_ = function() {
    // tell UI to show results & score
  };

  rq.QuizController = QuizController;
}());