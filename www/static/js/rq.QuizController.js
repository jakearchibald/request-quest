(function() {
  function QuizController() {
    var quizController = this;
    
    quizController.ready_ = rq.getJson('quiz-data.json').then(function(data) {
      // create QuizModel
      quizController.model = new rq.QuizModel(data);
      // create QuizUi
    });
  }

  var QuizControllerProto = QuizController.prototype;

  QuizControllerProto.start = function() {
    this.ready_.done(function() {
      // show intro
      // wait for quiz ui to fire 'start' event
      // call nextQuestion_
    });
  };

  QuizControllerProto.nextQuestion_ = function() {
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