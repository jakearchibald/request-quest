(function() {
  function toArray(arrayLike) {
    return Array.prototype.slice.call(arrayLike);
  }

  function QuizUi(questionUis) {
    this.intro_ = document.querySelector('.intro');
    this.finalResults_ = rq.utils.loadTemplate('.final-results-template');
    this.score_ = rq.utils.loadTemplate('.score-template');
    this.reset_ = rq.utils.loadTemplate('.reset-template');
    this.finalResultsContentTemplate_ = rq.utils.loadTemplate('.final-results-content-template');
    this.container_ = document.querySelector('.quiz-container');
    this.questions_ = this.container_.querySelector('.questions');
    this.scoreNum_ = this.score_.querySelector('.num');
    this.review_ = this.finalResults_.querySelector('.review');
    this.questionUis_ = questionUis;
    this.questionRotations_ = [];
    this.viewMode_ = 'intro';

    document.body.appendChild(this.container_);
    this.intro_.parentNode.removeChild(this.intro_);
    this.enhanceIntro_();
    this.enhanceReset_();
    this.layoutQuestions_();
  }

  var QuizUiProto = QuizUi.prototype = Object.create(rq.EventEmitter.prototype);

  QuizUiProto.enhanceReset_ = function() {
    var quizUi = this;

    function reset(event) {
      quizUi.trigger('resetSelected');
      event.preventDefault();
    }
    quizUi.reset_.querySelector('.reset-btn').addEventListener('click', reset);
    quizUi.finalResults_.querySelector('.reset-btn').addEventListener('click', reset);
  };

  QuizUiProto.enhanceIntro_ = function() {
    var quizUi = this;

    quizUi.intro_.querySelector('.start-btn').addEventListener('click', function(event) {
      quizUi.trigger('startQuizBtnSelected');
      event.preventDefault();
    });
  };

  QuizUiProto.layoutQuestions_ = function() {
    var quizUi = this;
    quizUi.questionUis_.forEach(function(questionUi, i) {
      quizUi.questions_.appendChild(questionUi.container);
      quizUi.questionRotations_[i] = (i/quizUi.questionUis_.length)*360;
      rq.utils.css(questionUi.container, 'transform', 'rotateY(' + quizUi.questionRotations_[i] + 'deg) translateZ(1300px)');
    });
  };

  QuizUiProto.showIntro = function() {
    this.container_.appendChild(this.intro_);
  };

  QuizUiProto.showQuestion = function(num) {
    var easing = 'easeInOutQuad';
    var duration = 0.5;

    if (this.viewMode_ == 'intro') {
      var val = rq.utils.css(this.questions_, 'transform');
      this.toQuestionView_();
      this.questions_.classList.remove('spin');
      rq.utils.css(this.questions_, 'transform', 'rotateY(700deg)');
      easing = 'easeOutQuart';
      duration = 3;
    }

    rq.utils.transition(this.questions_, {
      transform: 'rotateY(' + -(this.questionRotations_[num]) + 'deg)'
    }, duration, easing);
  };

  QuizUiProto.destroyQuestion = function(num) {
    var questionContainer = this.questionUis_[num].container;
    var rotation = this.questionRotations_[num];

    return rq.utils.transition(questionContainer, {
      transform: 'rotateY(' + rotation + 'deg) translateZ(1300px) translateZ(-2189px) rotateX(-180deg) rotateY(-48deg) rotateZ(-23deg)',
      opacity: 0
    }, 0.4, 'linear').then(function() {
      questionContainer.style.display = 'none';
    });
  };

  QuizUiProto.toQuestionView_ = function() {
    rq.utils.transition(this.container_, {
      transform: 'translateZ(-1300px)'
    }, 2, 'easeInOutQuad');
    this.viewMode_ = 'question';
  };

  QuizUiProto.score = function(score) {
    this.scoreNum_.textContent = score;
  };

  QuizUiProto.showFinalResults = function(score, maxScore) {
    emptyEl(this.container_);

    var review = "Review TODO";

    /*
    if (score < 6) {
      review = "Well, at least you made it out with your life intact, if not your dignity";
    }
    else if (score < 10) {
      review = "Hey, don't beat yourself up about it, you'd only mess it up. Get someone who really doesn't like you to do it instead.";
    }
    else if (score < 18) {
      review = "That performance was like the film Taken 2. You went in guns blazing but the result was, well, ok-ish. Wouldn't buy you on DVD.";
    }
    else if (score < 24) {
      review = "Not bad at all considering. If you were my child you'd be my second favourite. Despite being the only one.";
    }
    else if (score < 31) {
      review = "Pretty damn good. Difficult to do better without guessing what individual browsers do. It's ok to be risk-adverse, it's just not very… interesting.";
    }
    else if (score < 36) {
      review = "Difficult to criticise that without being childish, so: Hahaha *points* you're a massive nerd.";
    }
    else {
      review = "You cheated. You cheated and I hate you.";
    }
    */

    this.review_.innerHTML = this.finalResultsContentTemplate_({
      score: score,
      scoreSingular: score === 1,
      maxScore: maxScore,
      review: review
    });

    this.container_.appendChild(this.finalResults_);
  };

  rq.QuizUi = QuizUi;
})();