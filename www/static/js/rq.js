var rq = {};

rq.get = function(url) {
  var deferred = Q.defer();
  var req = new XMLHttpRequest();
  
  req.open('get', url);
  req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
  
  req.addEventListener('load', function() {
    deferred.resolve(req);
  });

  req.addEventListener('error', function() {
    deferred.reject(req);
  });

  req.send();
  return deferred.promise;
};

rq.getJson = function(url) {
  return rq.get(url).then(function(req) {
    return JSON.parse(req.responseText);
  });
};

// QuizController
//   Holds QuizModel
//   Start the quiz UI
//   Start question controller for each question
// QuizUi
//   The UI that the quiz sits in
// QuizModel
//   Holds the scores & questions, creates question modes from json
// QuestionController
//   Holds QuestionModel
// QuestionUi
//   Takes Question model for data, can display answers & explaination
// QuestionModel
//   Basically the spec json joined with the results
//   Knows what phases the user has provided answers for & if we should display the next phase
// CodeUi
//   If we're doing complex interactive replacement stuff, a seperate model is good



(function() {
  rq.QuizUi = function() {
    // inherit event interface (from backbone)
    // gather elements from page
    // get question template
  };

  rq.QuizUi.prototype.showIntro = function() {
    // enhance intro page, add start button
  };

  rq.QuizUi.prototype.showQuestion = function(title, subtitle) {
    // animate into quiz mode
    // show question
  };

  rq.QuizUi.prototype.showPhase = function(code) {
    // wait for state anim if needed
    // show code & answer buttons
    // use questionui, if this code gets large
  };

  rq.QuizUi.prototype.showAnswer = function(pointsAwarded, explanation) {
    // switch to answer state
    // show explainaion & some comment about the score
  };
}());

(function() {
  rq.QuestionController = function(questionModel, quizUi) {
    // set phase = 0
    // QuizUi on answer:
    //   Update model
    //   if answered, showAnswer_
    //   else if no more phases, questionModel.passRemaining & showAnswer_
    //   else nextPhase_
    // QuizUi on continue
    //   call end_
  };

  rq.QuestionController.prototype.start = function() {
    // give QuizUi question to display
    // call nextPhase
  };

  rq.QuestionController.prototype.nextPhase_ = function() {
    // increment phase
    // quizUi.showPhase(phaseNum)
  };

  rq.QuestionController.prototype.showAnswer_ = function() {
    // quizUi.showAnswer
  };

  rq.QuestionController.prototype.end_ = function() {
    // remove listeners
    // fire event
  };
}());