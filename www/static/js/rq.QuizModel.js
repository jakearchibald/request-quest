(function() {
  var localStorageKey = 'rq1';

  function QuizModel(data) {
    this.questions = data.map(function(questionSpec) {
      return new rq.QuestionModel(questionSpec);
    });
    this.score_ = 0;
  }

  var QuizModelProto = QuizModel.prototype;

  Object.defineProperty(QuizModelProto, 'score', { get: function() {
    return this.questions.reduce(function(total, question) {
      return total + question.score;
    }, 0);
  }});

  Object.defineProperty(QuizModelProto, 'maxScore', { get: function() {
    return this.questions.reduce(function(total, question) {
      return total + question.maxScore;
    }, 0);
  }});

  // save user progress to local storage
  // In format { question.id: {
  //   'playerAnswer': question.playerAnswer,
  //   'score': question.score
  // }}
  QuizModelProto.save = function() {
    var progress = {};
    
    this.questions.forEach(function(question) {
      progress[question.id] = {
        playerAnswer: question.playerAnswer,
        score: question.score
      };
    });

    try {
      localStorage.setItem(localStorageKey, JSON.stringify(progress));
    }
    catch(e) { // probably should do something smart here
    }
  };

  // load user progress from local storage
  // returns true if game-in-progress loaded
  QuizModelProto.load = function() {
    var progress;
    var gameInProgress = false;

    try {
      progress = JSON.parse(localStorage.getItem(localStorageKey));
    }
    catch(e) { // probably should do something smart here
    }

    // key not created yet
    if (!progress) { return; }

    this.questions.forEach(function(question) {
      var data = progress[question.id];
      if (data) {
        gameInProgress = gameInProgress || !!Object.keys(data.playerAnswer)[0];
        question.playerAnswer = data.playerAnswer;
        question.score = data.score;
      }
    });

    return gameInProgress;
  };

  QuizModelProto.reset = function() {
    try {
      localStorage.removeItem(localStorageKey);
    }
    catch(e) { // probably should do something smart here
    }

    this.questions.forEach(function(question) {
      question.reset();
    });
  };

  rq.QuizModel = QuizModel;
})();