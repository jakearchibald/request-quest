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

  function loadTemplate(selector) {
    var elm = $(selector);
    if (elm.type == "text/html") {
      return elFromStr(elm.textContent);
    }
    else if (elm.type == "application/x-mustache") {
      return Mustache.compile(elm.textContent);
    }
  }

  function QuizUi() {
    this.intro_ = $('.intro');
    this.question_ = loadTemplate('.question-template');
    this.questionContextTemplate_ = loadTemplate('.question-context-template');
    this.answer_ = loadTemplate('.answer-template');
    this.answerContentTemplate_ = loadTemplate('.answer-content-template');
    this.finalResults_ = loadTemplate('.final-results-template');
    this.finalResultsContentTemplate_ = loadTemplate('.final-results-content-template');
    this.introBtnsTemplate_ = loadTemplate('.intro-btns-template');
    this.container_ = elFromStr('<div class="quiz-container"></div>');
    this.browserChoices_ = this.question_.querySelector('.choices');
    this.questionContext_ = this.question_.querySelector('.context');
    this.questionCode_ = this.question_.querySelector('.phase-code');
    this.answerContent_ = this.answer_.querySelector('.answer-content');
    this.introChoices_ = this.intro_.querySelector('.start-options');

    document.body.appendChild(this.container_);
    this.intro_.parentNode.removeChild(this.intro_);
    this.enhanceQuestion_();
    this.enhanceAnswer_();
  }

  var QuizUiProto = QuizUi.prototype = Object.create(rq.EventEmitter.prototype);

  QuizUiProto.enhanceAnswer_ = function() {
    var quizUi = this;

    quizUi.answer_.querySelector('.continue-btn').addEventListener('click', function(event) {
      quizUi.trigger('continueBtnSelected');
      event.preventDefault();
    });
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

  QuizUiProto.showIntro = function(gameInProgress) {
    var quizUi = this;

    emptyEl(quizUi.container_);
    quizUi.introChoices_.innerHTML = quizUi.introBtnsTemplate_({
      gameInProgress: gameInProgress
    });

    quizUi.introChoices_.querySelector('.start-btn').addEventListener('click', function(event) {
      quizUi.trigger('startQuizBtnSelected');
      event.preventDefault();
    });

    if (gameInProgress) {
      quizUi.introChoices_.querySelector('.restart-btn').addEventListener('click', function(event) {
        quizUi.trigger('restartQuizBtnSelected');
        event.preventDefault();
      });
    }
    
    quizUi.container_.appendChild(quizUi.intro_);
  };

  QuizUiProto.showQuestion = function(title, subtitle) {
    emptyEl(this.container_);
    this.container_.appendChild(this.question_);
    this.questionContext_.innerHTML = this.questionContextTemplate_({
      title: title,
      subtitle: subtitle
    });
    this.browserChoices_.style.display = 'none';
  };

  QuizUiProto.showBrowserChoices = function(browsers) {
    this.browserChoices_.style.display = 'block';

    toArray(this.browserChoices_.querySelectorAll('.browser-choice')).forEach(function(choice) {
      var checkbox = choice.querySelector('input[type=checkbox]');

      // this resets the checkboxes, but also avoids checked-but-hidden boxes turning up in results
      checkbox.checked = false;
      
      if (browsers.indexOf(checkbox.id) != -1) {
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

  QuizUiProto.showAnswer = function(title, pointsAwarded, breakdown, explanation) {
    emptyEl(this.container_);
    this.container_.appendChild(this.answer_);
    this.answerContent_.innerHTML = this.answerContentTemplate_({
      title: title,
      pointsAwarded: pointsAwarded,
      pointsAwardedSingular: pointsAwarded === 1,
      breakdown: breakdown,
      explanation: explanation
    });
  };

  QuizUiProto.showFinalResults = function(score, maxScore) {
    emptyEl(this.container_);
    this.container_.appendChild(this.finalResults_);

    var review;

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

    this.finalResults_.innerHTML = this.finalResultsContentTemplate_({
      score: score,
      scoreSingular: score === 1,
      maxScore: maxScore,
      review: review
    });
  };

  rq.QuizUi = QuizUi;
})();