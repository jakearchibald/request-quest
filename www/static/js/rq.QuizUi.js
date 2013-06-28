(function() {
  var desktopView = window.matchMedia('(min-width: 420px)').matches;
  var desktopScreen = window.matchMedia('(min-device-width: 420px)').matches;

  function toArray(arrayLike) {
    return Array.prototype.slice.call(arrayLike);
  }

  function fullscreenPage() {
    var elm = document.documentElement;
    var deferred = Q.defer();
    var prefixes = ['webkit', 'moz', ''];
    var requestFullscreen = elm.requestFullscreen || elm.webkitRequestFullscreen || elm.mozRequestFullscreen;

    function removeListeners() {
      prefixes.forEach(function(prefix) {
        elm.removeEventListener(prefix + 'fullscreenchange', done);
        elm.removeEventListener(prefix + 'fullscreenerror', error);
      });
    }
    function done() {
      removeListeners();
      // let fullscreen engage
      setTimeout(function() {
        deferred.resolve();
      }, 1000);
    }
    function error() {
      removeListeners();
      deferred.reject();
    }

    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullscreenElement) {
      deferred.resolve();
    }
    else if (requestFullscreen) {
      prefixes.forEach(function(prefix) {
        elm.addEventListener(prefix + 'fullscreenchange', done);
        elm.addEventListener(prefix + 'fullscreenerror', error);
      });
      requestFullscreen.call(elm);
    }
    else {
      deferred.reject();
    }

    return deferred.promise;
  }

  function QuizUi(questionUis) {
    this.intro_ = document.querySelector('.intro');
    this.finalResults_ = rq.utils.loadTemplate('.final-results-template');
    this.score_ = document.querySelector('.score');
    this.finalResultsContentTemplate_ = rq.utils.loadTemplate('.final-results-content-template');
    this.container_ = document.querySelector('.quiz-container');
    this.world_ = this.container_ .querySelector('.world');
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
      if (desktopView) {
        quizUi.questionRotations_[i] = (i/quizUi.questionUis_.length)*360;
        rq.utils.css(questionUi.container, 'transform', 'rotateY(' + quizUi.questionRotations_[i] + 'deg) translateZ(1300px)');
      }
      else {
        questionUi.container.style.display = 'none';
        rq.utils.css(questionUi.container, 'transform', 'translateZ(-500px)');
        questionUi.container.style.opacity = 0;
      }
    });
  };

  QuizUiProto.showIntro = function() {
    this.world_.appendChild(this.intro_);
  };

  QuizUiProto.showQuestion = function(num) {
    var easing = 'easeInOutQuad';
    var duration = 0.5;
    var quizUi = this;

    if (quizUi.viewMode_ == 'intro') {
      quizUi.toQuestionView_();
      quizUi.questions_.classList.remove('spin');
      if (desktopView) {
        rq.utils.css(quizUi.questions_, 'transform', 'rotateY(700deg)');
        easing = 'easeOutQuart';
        duration = 3;
      }
    }

    if (desktopView) {
      rq.utils.transition(quizUi.questions_, {
        transform: 'rotateY(' + -(quizUi.questionRotations_[num]) + 'deg)'
      }, duration, easing);
    }
    else {
      quizUi.questionUis_[num].container.style.display = '';

      rq.utils.transition(quizUi.questionUis_[num].container, {
        transform: '',
        opacity: 1
      }, 0.5);
    }
  };

  QuizUiProto.destroyQuestion = function(num) {
    var questionContainer = this.questionUis_[num].container;
    var rotation = this.questionRotations_[num];

    if (desktopView) {
      return rq.utils.transition(questionContainer, {
        transform: 'rotateY(' + rotation + 'deg) translateZ(1300px) translateZ(-2189px) rotateX(-180deg) rotateY(-48deg) rotateZ(-23deg)',
        opacity: 0
      }, 0.4, 'linear').then(function() {
        questionContainer.style.display = 'none';
      });
    }
    else {
      rq.utils.transition(questionContainer, {
        transform: 'translateZ(500px)',
          opacity: 0
      }, 0.5).then(function() {
        questionContainer.style.display = 'none';
      });
      return Q.resolve();
    }
  };

  QuizUiProto.toQuestionView_ = function() {
    var quizUi = this;

    if (desktopView) {
      rq.utils.transition(quizUi.world_, {
        transform: 'translateZ(-1300px)'
      }, 2, 'easeInOutQuad').then(function() {
        rq.utils.transition(quizUi.score_, {
          transform: 'translate(0,0)'
        }, 0.4, 'easeOutQuad');
      });
    }
    else {
      rq.utils.transition(quizUi.intro_, {
        transform: 'translateZ(500px)',
        opacity: 0
      }, 0.5).then(function() {
        quizUi.intro_.style.display = 'none';
      });
    }
    quizUi.viewMode_ = 'question';
  };

  QuizUiProto.prepareScreen = function() {
    if (desktopScreen) {
      return Q.resolve();
    }
    else {
      return fullscreenPage().catch(function() {});
    }
  };

  QuizUiProto.score = function(score) {
    this.scoreNum_.textContent = score;
  };

  QuizUiProto.showFinalResults = function(score, maxScore) {
    var review;

    if (score < 20) {
      review = "Here's a fun fact: If you just blindly clicked 'yes' for every answer, you'd have scored better. But don't beat yourself up about it. I mean, you might hit someone else by accident.";
    }
    else if (score < 23) {
      review = "Sigh. Oh well. At least no one got hurt. That's the best we can take from that.";
    }
    else if (score < 25) {
      review = "That performance was like the film Taken 2. You went in guns blazing but the result was, well, ugh. Wouldn't buy you on DVD.";
    }
    else if (score < 29) {
      review = "Not too bad. If you were my child you'd be my second favourite. Even if I only had one child.";
    }
    else if (score < 32) {
      review = "Pretty damn good. There's a lot of gotchas in there that you managed to avoid.";
    }
    else if (score < 35) {
      review = "Difficult to criticise that score without being childish, so: Hahaha *points* you're a massive nerd.";
    }
    else if (score < 35) {
      review = "Wow, that was impressive! You hardly tripped up at all. Give yourself a gold star.";
    }
    else {
      review = "You cheated. You cheated and I hate you.";
    }

    this.review_.innerHTML = this.finalResultsContentTemplate_({
      score: score,
      scoreSingular: score === 1,
      maxScore: maxScore,
      review: review
    });

    this.world_.appendChild(this.finalResults_);


    if (desktopView) {
      rq.utils.css(this.finalResults_, 'transform', 'translateZ(1800px)');

      rq.utils.transition(this.score_, {
        transform: 'translate(0,-100%)'
      }, 0.4, 'easeOutQuad');

      rq.utils.transition(this.finalResults_, {
        opacity: '1',
        transform: 'translateZ(1300px)'
      }, 0.5, 'easeOutQuad');
    }
    else {
      rq.utils.css(this.finalResults_, 'transform', 'translateZ(-500px)');
      rq.utils.transition(this.finalResults_, {
        opacity: '1',
        transform: ''
      }, 0.5);
    }
  };

  rq.QuizUi = QuizUi;
})();