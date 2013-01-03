(function() {
  function QuizModel(data) {
    this.score_ = 0;
    this.questions = data.map(function(questionSpec) {
      return new rq.QuestionModel(questionSpec);
    });
  }

  var QuizModelProto = QuizModel.prototype;

  rq.QuizModel = QuizModel;
})();