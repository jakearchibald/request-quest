(function() {
  function toArray(arrayLike) {
    return Array.prototype.slice.call(arrayLike);
  }

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
    this.browserChoices_ = this.question_.querySelector('.choices');
    this.questionTitle_ = this.question_.querySelector('.title');
    this.questionSubtitle_ = this.question_.querySelector('.subtitle');
    this.questionCode_ = this.question_.querySelector('.phase-code');

    document.body.appendChild(this.container_);
    this.intro_.parentNode.removeChild(this.intro_);
    this.enhanceIntro_();
    this.enhanceQuestion_();
  }

  var QuizUiProto = QuizUi.prototype = Object.create(rq.EventEmitter.prototype);

  QuizUiProto.enhanceIntro_ = function() {
    var quizUi = this;
    var nextBtn = elFromStr('<button type="button">Begin</button>');
    nextBtn.addEventListener('click', function(event) {
      quizUi.trigger('startBtnSelected');
      event.preventDefault();
    });
    quizUi.intro_.appendChild(nextBtn);
  };

  QuizUiProto.enhanceQuestion_ = function() {
    var quizUi = this;

    quizUi.question_.querySelector('.yes-btn').addEventListener('click', function(event) {
      quizUi.trigger('answerYes');
      event.preventDefault();
    });

    quizUi.question_.querySelector('.no-btn').addEventListener('click', function(event) {
      quizUi.trigger('answerNo');
      event.preventDefault();
    });

    quizUi.question_.querySelector('.some-btn').addEventListener('click', function(event) {
      quizUi.trigger('answerSome');
      event.preventDefault();
    });

    quizUi.question_.querySelector('.those-btn').addEventListener('click', function(event) {
      var checked = toArray(quizUi.browserChoices_.querySelectorAll('input[type=checkbox]')).filter(function(checkbox) {
        return checkbox.checked;
      }).map(function(checkbox) {
        return checkbox.id;
      });

      quizUi.trigger('answerThose', checked);
      event.preventDefault();
    });
  };

  QuizUiProto.showIntro = function() {
    emptyEl(this.container_);
    this.container_.appendChild(this.intro_);
  };

  QuizUiProto.showQuestion = function(title, subtitle) {
    emptyEl(this.container_);
    this.container_.appendChild(this.question_);
    this.questionTitle_.textContent = title;
    this.questionSubtitle_.textContent = subtitle;
    this.browserChoices_.style.display = 'none';
  };

  QuizUiProto.showBrowserChoices = function(browsers) {
    this.browserChoices_.style.display = 'block';

    toArray(this.browserChoices_.querySelectorAll('.browser-choice')).forEach(function(choice) {
      if (browsers.indexOf(choice.querySelector('input[type=checkbox]').id) != -1) {
        choice.style.display = 'block';
      }
      else {
        choice.style.display = 'none';
      }
    });
  };

  QuizUiProto.showPhaseCode = function(code) {
    this.questionCode_.textContent = code;
    this.browserChoices_.style.display = 'none';
  };

  QuizUiProto.showAnswer = function(pointsAwarded, explanation) {
    // switch to answer state
    // show explainaion & some comment about the score
  };

  rq.QuizUi = QuizUi;
})();