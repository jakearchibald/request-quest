(function() {
  var localStorageKey = 'rq1';

  function QuizModel(data) {
    this.questions = data.map(function(questionSpec, i) {
      return new rq.QuestionModel(i+1, questionSpec);
    });
    this.score = 0;
  }

  var QuizModelProto = QuizModel.prototype;

  Object.defineProperty(QuizModelProto, 'maxScore', { get: function() {
    return this.questions.reduce(function(total, question) {
      return total + question.phases.length;
    }, 0);
  }});

  rq.QuizModel = QuizModel;
})();