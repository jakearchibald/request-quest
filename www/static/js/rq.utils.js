(function() {
  var utils = {};

  var easings = {
    easeInQuad: 'cubic-bezier(0.550, 0.085, 0.680, 0.530)',
    easeInCubic: 'cubic-bezier(0.550, 0.055, 0.675, 0.190)',
    easeInQuart: 'cubic-bezier(0.895, 0.030, 0.685, 0.220)',
    easeInQuint: 'cubic-bezier(0.755, 0.050, 0.855, 0.060)',
    easeInSine: 'cubic-bezier(0.470, 0.000, 0.745, 0.715)',
    easeInExpo: 'cubic-bezier(0.950, 0.050, 0.795, 0.035)',
    easeInCirc: 'cubic-bezier(0.600, 0.040, 0.980, 0.335)',
    easeOutQuad: 'cubic-bezier(0.250, 0.460, 0.450, 0.940)',
    easeOutCubic: 'cubic-bezier(0.215, 0.610, 0.355, 1.000)',
    easeOutQuart: 'cubic-bezier(0.165, 0.840, 0.440, 1.000)',
    easeOutQuint: 'cubic-bezier(0.230, 1.000, 0.320, 1.000)',
    easeOutSine: 'cubic-bezier(0.390, 0.575, 0.565, 1.000)',
    easeOutExpo: 'cubic-bezier(0.190, 1.000, 0.220, 1.000)',
    easeOutCirc: 'cubic-bezier(0.075, 0.820, 0.165, 1.000)',
    easeInOutQuad: 'cubic-bezier(0.455, 0.030, 0.515, 0.955)',
    easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1.000)',
    easeInOutQuart: 'cubic-bezier(0.770, 0.000, 0.175, 1.000)',
    easeInOutQuint: 'cubic-bezier(0.860, 0.000, 0.070, 1.000)',
    easeInOutSine: 'cubic-bezier(0.445, 0.050, 0.550, 0.950)',
    easeInOutExpo: 'cubic-bezier(1.000, 0.000, 0.000, 1.000)',
    easeInOutCirc: 'cubic-bezier(0.785, 0.135, 0.150, 0.860)'
  };
  var transitionend = ['transitionend', 'webkitTransitionEnd', 'oTransitionEnd'];
  var getCssPropName = (function() {
    var style = document.body.style;
    var prefixes = ['Webkit', 'O', 'Ms', 'Moz'];
    var cache = {};

    return function(propertyName) {
      if ( propertyName in cache ) {
        return cache[propertyName];
      }

      var supportedValue = '';
      var i = prefixes.length;
      var upperCamelPropertyName;
      var camelPropertyName = propertyName.replace(/-([a-z])/ig, function( all, letter ) {
        return letter.toUpperCase();
      });

      if ( camelPropertyName in style ) {
        supportedValue = propertyName;
      }
      else {
        // uppercase first char
        upperCamelPropertyName = camelPropertyName.slice(0,1).toUpperCase() + camelPropertyName.slice(1);
        while (i--) if ( prefixes[i] + upperCamelPropertyName in style ) {
          supportedValue = (prefixes[i] + upperCamelPropertyName);
          break;
        }
      }

      return cache[propertyName] = supportedValue;
    };
  })();

  utils.css = function(el, prop, val) {
    if (val === undefined) {
      return window.getComputedStyle(el)[getCssPropName(prop)];
    }
    else {
      el.style[getCssPropName(prop)] = val;
    }
  };

  utils.transition = function(el, props, duration, easing) {
    var translatedProps = {};
    var propsStr = '';
    var translatedProp;
    var deferred = Q.defer();
    var prop;

    for (prop in props) {
      translatedProp = getCssPropName(prop);
      if (translatedProp) {
        translatedProps[prop] = props[prop];
        propsStr += (propsStr ? ',' : '') + prop;
      }
    }

    function complete(event) {
      if ( event.target != el ) {
        return;
      }
      transitionend.forEach(function(eventName) {
        el.removeEventListener(eventName, complete);
      });

      el.style[getCssPropName('transition')] = '';
      el.offsetWidth; // force layout
      deferred.resolve();
    }

    el.offsetWidth; // force layout

    transitionend.forEach(function(eventName) {
      el.addEventListener(eventName, complete);
    });

    el.style[getCssPropName('transition')] = 'all ' + duration + 's ' + (easings[easing ||'easeInOutQuad'] || easing);
    el.style[getCssPropName('transition-property')] = propsStr;

    for (prop in translatedProps) {
      el.style[getCssPropName(prop)] = translatedProps[prop];
    }

    return deferred.promise;
  };

  utils.elFromStr = (function() {
    var div = document.createElement('div');
    return function(str) {
      div.innerHTML = str.trim();
      var elm = div.firstChild;
      // have to do this, else IE removes every node
      div.removeChild(div.firstChild);
      return elm;
    };
  }());

  utils.emptyEl = function(el) {
    while (el.lastChild) {
      el.removeChild(el.lastChild);
    }
  };

  utils.loadTemplate = function(selector) {
    var elm = document.querySelector(selector);
    if (elm.type == "text/html") {
      return utils.elFromStr(elm.textContent);
    }
    else if (elm.type == "application/x-mustache") {
      return Mustache.compile(elm.textContent);
    }
  };

  rq.utils = utils;
})();