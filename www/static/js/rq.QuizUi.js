(function() {
  function $(selector, context) {
    return document.querySelector(selector, context);
  }

  function $$(selector) {
    return document.querySelectorAll(selector, context);
  }

  var elFromStr = (function() {
    var div = document.createElement('div');
    return function(str) {
      div.innerHTML = str.trim();
      return div.firstChild;
    };
  }());

  function emptyEl(el) {
    while (el.lastChild) {
      el.removeChild(el.lastChild);
    }
  }

  function QuizUi() {
    this.intro_ = $('.intro');
    this.question_ = elFromStr($('.question-template').textContent);
    this.container_ = elFromStr('<div class="quiz-container"></div>');
    document.body.appendChild(this.container_);
    this.intro_.parentNode.removeChild(this.intro_);
    this.enhanceIntro_();
  }

  var QuizUiProto = QuizUi.prototype = Object.create(rq.EventEmitter.prototype);

  QuizUiProto.enhanceIntro_ = function() {
    var quizUi = this;
    var nextBtn = elFromStr('<button type="button">Begin</button>');
    nextBtn.addEventListener('click', function() {
      quizUi.trigger('startBtnSelected');
    });
    quizUi.intro_.appendChild(nextBtn);
  };

  QuizUiProto.showIntro = function() {
    emptyEl(this.container_);
    this.container_.appendChild(this.intro_);
  };

  QuizUiProto.showQuestion = function(title, subtitle) {
    // animate into quiz mode
    // show question
  };

  QuizUiProto.showPhase = function(code) {
    // wait for state anim if needed
    // show code & answer buttons
    // use questionui, if this code gets large
  };

  QuizUiProto.showAnswer = function(pointsAwarded, explanation) {
    // switch to answer state
    // show explainaion & some comment about the score
  };

  rq.QuizUi = QuizUi;
})();