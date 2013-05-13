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
      var elm = div.firstChild;
      // have to do this, else IE removes every node
      div.removeChild(div.firstChild);
      return elm;
    };
  }());

  function emptyEl(el) {
    while (el.lastChild) {
      el.removeChild(el.lastChild);
    }
  }

  function loadTemplate(selector) {
    var elm = $(selector);
    if (elm.type == "text/html") {
      return elFromStr(elm.textContent);
    }
    else if (elm.type == "application/x-mustache") {
      return Mustache.compile(elm.textContent);
    }
  }

  var browserMap = {
    ie: "IE",
    chrome: "Chrome",
    firefox: "Firefox",
    safari: "Safari"
  };

  function QuizUi() {
    this.intro_ = $('.intro');
    this.question_ = loadTemplate('.question-template');
    this.finalResults_ = loadTemplate('.final-results-template');
    this.score_ = loadTemplate('.score-template');
    this.reset_ = loadTemplate('.reset-template');
    this.finalResultsContentTemplate_ = loadTemplate('.final-results-content-template');
    this.answerContentTemplate_ = loadTemplate('.answer-content-template');
    this.container_ = $('.quiz-container');
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
    this.scoreNum_ = this.score_.querySelector('.num');
    this.review_ = this.finalResults_.querySelector('.review');

    document.body.appendChild(this.container_);
    this.intro_.parentNode.removeChild(this.intro_);
    this.enhanceQuestion_();
    this.enhanceIntro_();
    this.enhanceReset_();
  }

  var QuizUiProto = QuizUi.prototype = Object.create(rq.EventEmitter.prototype);

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

    quizUi.question_.querySelector('.continue-btn').addEventListener('click', function(event) {
      quizUi.trigger('continue');
      event.preventDefault();
    });
  };

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

  QuizUiProto.showIntro = function() {
    emptyEl(this.container_);
    this.container_.appendChild(this.intro_);
  };

  QuizUiProto.showQuestion = function(title, requestDesc) {
    emptyEl(this.container_);
    this.question_.classList.add('first-phase');
    this.questionButtons_.style.display = 'block';
    this.answerFeedback_.style.display = 'none';
    rq.utils.css(this.questionButtons_, "transform", 'rotateX(0deg)');

    toArray(this.question_.querySelectorAll('.browsers-remaining > *')).forEach(function(browser) {
      browser.classList.remove('active');
      browser.classList.remove('inactive');
    });

    this.browserIcons_.classList.remove('reveal');

    this.container_.appendChild(this.question_);
    this.container_.appendChild(this.score_);
    this.container_.appendChild(this.reset_);
    this.questionTitle_.textContent = title;
    this.questionRequest_.textContent = requestDesc;
  };

  QuizUiProto.showAnswer = function(wasCorrect, browsers, explanation) {
    var quizUi = this;

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

  QuizUiProto.score = function(score) {
    this.scoreNum_.textContent = score;
  };

  QuizUiProto.continueQuestion = function(lang, code) {
    var quizUi = this;
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

  QuizUiProto.showPhaseCode = function(lang, code) {
    this.questionCode_.className = lang;
    this.questionCode_.innerHTML = code;
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