(function() {
  var desktopView = window.matchMedia('(min-device-width: 640px)').matches;
  /*
  // for testing
  var desktopView = window.matchMedia('(min-width: 640px)').matches;
  */

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
    this.feedbackFader_ = this.answerFeedback_.querySelector('.fader');
    this.buttonsFader_ = this.questionButtons_.querySelector('.fader');
    this.codeFader_ = this.question_.querySelector('.code-detail .fader');
    this.browserIcons_ = this.question_.querySelector('.browsers-remaining');

    this.enhanceQuestion_();
  }

  var QuestionUiProto = QuestionUi.prototype = Object.create(rq.EventEmitter.prototype);

  QuestionUiProto.enhanceQuestion_ = function() {
    var quizUi = this;
    var yesBtn = quizUi.question_.querySelector('.yes-btn');
    var noBtn = quizUi.question_.querySelector('.no-btn');
    var continueBtn = quizUi.question_.querySelector('.continue-btn');

    function yesClick(event) {
      quizUi.trigger('answerYes');
      quizUi.questionButtons_.style.pointerEvents = 'none';
      event.preventDefault();
    }

    yesBtn.addEventListener('touchstart', yesClick);
    yesBtn.addEventListener('click', yesClick);

    function noClick(event) {
      quizUi.trigger('answerNo');
      quizUi.questionButtons_.style.pointerEvents = 'none';
      event.preventDefault();
    }

    noBtn.addEventListener('touchstart', noClick);
    noBtn.addEventListener('click', noClick);

    function continueClick(event) {
      quizUi.trigger('continue');
      quizUi.answerFeedback_.style.pointerEvents = 'none';
      event.preventDefault();
    }

    // causes a janky outro in chrome, how odd
    //continueBtn.addEventListener('touchstart', continueClick);
    continueBtn.addEventListener('click', continueClick);
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

  QuestionUiProto.unlock = function() {
    this.question_.classList.add('unlocked');
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

    if (desktopView) {
      rq.utils.transition(quizUi.questionButtons_, {
        transform: 'rotateX(-90deg)'
      }, 0.3).then(function() {
        quizUi.browserIcons_.classList.add('reveal');
        quizUi.questionButtons_.style.opacity = '0';
        quizUi.answerFeedback_.classList.add('show');
        rq.utils.css(quizUi.answerFeedback_, "transform", 'rotateX(-90deg)');
        rq.utils.transition(quizUi.question_, {
          transform: 'translate(0, ' + Math.floor((quizUi.questionButtons_.offsetHeight - quizUi.answerFeedback_.offsetHeight)/2) + 'px)'
        }, 0.3);
        return rq.utils.transition(quizUi.answerFeedback_, {
          transform: 'rotateX(0deg)'
        }, 0.3);
      });
    }
    else {
      rq.utils.transition(quizUi.buttonsFader_, {
        opacity: 1
      }, 0.3).then(function() {
        quizUi.browserIcons_.classList.add('reveal');
        quizUi.questionButtons_.style.display = 'none';
        quizUi.answerFeedback_.classList.add('show');
        quizUi.feedbackFader_.style.opacity = '1';
        return rq.utils.transition(quizUi.feedbackFader_, {
          opacity: 0
        }, 0.3);
      });
    }
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

    if (desktopView) {
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
        quizUi.questionButtons_.style.opacity = '1';
        return rq.utils.transition(quizUi.questionButtons_, {
          transform: 'rotateX(0deg)'
        }, 0.3);
      }).then(function() {
        quizUi.answerFeedback_.classList.remove('show');
      });
    }
    else {
      rq.utils.transition(quizUi.feedbackFader_, {
        opacity: 1
      }, 0.3).then(function() {
        quizUi.questionButtons_.style.display = '';
        quizUi.answerFeedback_.classList.remove('show');
        quizUi.buttonsFader_.style.opacity = '1';
        quizUi.showPhaseCode(lang, code);
        quizUi.codeFader_.style.opacity = 1;

        rq.utils.transition(quizUi.codeFader_, {
          opacity: 0
        }, 0.5, 'easeOutQuad');

        rq.utils.transition(quizUi.buttonsFader_, {
          opacity: 0
        }, 0.3);
      });
    }

    quizUi.browserIcons_.classList.remove('reveal');
    quizUi.question_.classList.remove('first-phase');
  };

  QuestionUiProto.showPhaseCode = function(lang, code) {
    this.questionCode_.className = lang;
    this.questionCode_.innerHTML = code;
  };

  rq.QuestionUi = QuestionUi;
})();