(function() {
  function toArray(arrayLike) {
    return Array.prototype.slice.call(arrayLike);
  }

  var browserMap = {
    ie: "IE",
    chrome: "Chrome",
    firefox: "Firefox",
    safari: "Safari"
  };

  function QuestionUi() {
    this.container = rq.utils.loadTemplate('.question-template');
    this.question_ = this.container.querySelector('.question');
    this.answerContentTemplate_ = rq.utils.loadTemplate('.answer-content-template');
    this.questionTitle_ = this.question_.querySelector('.question-title');
    this.questionNum_ = this.question_.querySelector('.title .num');
    this.questionTotal_ = this.question_.querySelector('.title .total');
    this.questionRequest_ = this.question_.querySelector('.request');
    this.questionCodeContainer_ = this.question_.querySelector('.phase-code');
    this.questionCode_ = this.question_.querySelector('.phase-code code');
    this.questionButtons_ = this.question_.querySelector('.answer-buttons');
    this.answerFeedback_ = this.question_.querySelector('.answer-feedback');
    this.feedbackContent_ = this.question_.querySelector('.feedback-content');
    this.browserIcons_ = this.question_.querySelector('.browsers-remaining');

    this.enhanceQuestion_();
  }

  var QuestionUiProto = QuestionUi.prototype = Object.create(rq.EventEmitter.prototype);

  QuestionUiProto.enhanceQuestion_ = function() {
    var quizUi = this;

    quizUi.question_.querySelector('.yes-btn').addEventListener('click', function(event) {
      quizUi.trigger('answerYes');
      quizUi.questionButtons_.style.pointerEvents = 'none';
      event.preventDefault();
    });

    quizUi.question_.querySelector('.no-btn').addEventListener('click', function(event) {
      quizUi.trigger('answerNo');
      quizUi.questionButtons_.style.pointerEvents = 'none';
      event.preventDefault();
    });

    quizUi.question_.querySelector('.continue-btn').addEventListener('click', function(event) {
      quizUi.trigger('continue');
      quizUi.answerFeedback_.style.pointerEvents = 'none';
      event.preventDefault();
    });
  };

  QuestionUiProto.setQuestionTotal = function(total) {
    this.questionTotal_.textContent = total;
  };

  QuestionUiProto.setQuestion = function(num, title, requestDesc) {
    this.questionNum_.textContent = num;
    this.questionTitle_.textContent = title;
    this.questionRequest_.textContent = requestDesc;
  };

  QuestionUiProto.setInteractivity = function(state) {
    this.container.style.pointerEvents = state ? 'auto' : 'none';
  };

  QuestionUiProto.showAnswer = function(wasCorrect, browsers, explanation) {
    var quizUi = this;

    this.answerFeedback_.style.pointerEvents = 'auto';

    browsers.forEach(function(browser) {
      quizUi.question_.querySelector('.' + browser).classList.add('active');
    });


    // Format: browser, browser & browser
    var browserStr = browsers.reduce(function(str, browser, i) {
      if (i > 0) {
        if (i == browsers.length - 1) {
          str += " & ";
        }
        else {
          str += ", ";
        }
      }

      str += browserMap[browser];
      return str;
    }, '');

    quizUi.feedbackContent_.innerHTML = quizUi.answerContentTemplate_({
      wasCorrect: wasCorrect,
      browsers: browserStr,
      explanation: explanation
    });

    // make all links open in new window
    toArray(quizUi.feedbackContent_.querySelectorAll('a')).forEach(function(link) {
      link.target = '_blank';
    });

    if (wasCorrect) {
      quizUi.answerFeedback_.classList.add('correct');
      quizUi.answerFeedback_.classList.remove('incorrect');
    }
    else {
      quizUi.answerFeedback_.classList.remove('correct');
      quizUi.answerFeedback_.classList.add('incorrect');
    }

    rq.utils.transition(quizUi.questionButtons_, {
      transform: 'rotateX(-90deg)'
    }, 0.3).then(function() {
      quizUi.browserIcons_.classList.add('reveal');
      quizUi.answerFeedback_.style.display = 'block';
      rq.utils.css(quizUi.answerFeedback_, "transform", 'rotateX(-90deg)');
      rq.utils.transition(quizUi.question_, {
        transform: 'translate(0, ' + Math.floor((quizUi.questionButtons_.offsetHeight - quizUi.answerFeedback_.offsetHeight)/2) + 'px)'
      }, 0.3);
      return rq.utils.transition(quizUi.answerFeedback_, {
        transform: 'rotateX(0deg)'
      }, 0.3);
    });
  };

  QuestionUiProto.score = function(score) {
    this.scoreNum_.textContent = score;
  };

  QuestionUiProto.continueQuestion = function(lang, code) {
    var quizUi = this;

    quizUi.questionButtons_.style.pointerEvents = 'auto';

    toArray(quizUi.question_.querySelectorAll('.browsers-remaining .active')).forEach(function(activeEl) {
      activeEl.classList.remove('active');
      activeEl.classList.add('inactive');
    });

    rq.utils.transition(quizUi.question_, {
      transform: 'translate(0, 0)'
    }, 0.3);

    rq.utils.transition(quizUi.answerFeedback_, {
      transform: 'rotateX(-90deg)'
    }, 0.3).then(function() {
      quizUi.questionCodeContainer_.style.height = quizUi.questionCodeContainer_.offsetHeight + 'px';
      return rq.utils.transition(quizUi.questionCodeContainer_, {
        height: '0'
      }, 0.3);
    }).then(function() {
      quizUi.showPhaseCode(lang, code);
      quizUi.questionCodeContainer_.style.height = '';
      var heightTo = quizUi.questionCodeContainer_.offsetHeight;
      quizUi.questionCodeContainer_.style.height = '0';

      return rq.utils.transition(quizUi.questionCodeContainer_, {
        height: heightTo + 'px'
      }, 0.3).then(function() {
        quizUi.questionCodeContainer_.style.height = '';
      });
    }).then(function() {
      return rq.utils.transition(quizUi.questionButtons_, {
        transform: 'rotateX(0deg)'
      }, 0.3);
    }).then(function() {
      quizUi.questionButtons_.style.display = 'block';
      quizUi.answerFeedback_.style.display = 'none';
    });

    quizUi.browserIcons_.classList.remove('reveal');
    quizUi.question_.classList.remove('first-phase');
  };

  QuestionUiProto.showPhaseCode = function(lang, code) {
    this.questionCode_.className = lang;
    this.questionCode_.innerHTML = code;
  };

  rq.QuestionUi = QuestionUi;
})();