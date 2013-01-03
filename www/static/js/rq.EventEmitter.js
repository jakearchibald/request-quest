// Based on https://raw.github.com/jeromeetienne/microevent.js/master/microevent.js
rq.EventEmitter = function(){};
rq.EventEmitter.prototype = {
  on: function(event, fct){
    this._events = this._events || {};
    this._events[event] = this._events[event] || [];
    this._events[event].push(fct);
    return this;
  },
  one: function(event, fct) {
    var microEvent = this;
    function wrappedFct() {
      fct.apply(this, arguments);
      microEvent.off(event, wrappedFct);
      delete fct.wrappedFct;
    }
    fct.wrappedFct = wrappedFct;
    return this.on(event, wrappedFct);
  },
  off: function(event, fct){
    fct = fct.wrappedFct || fct;
    this._events = this._events || {};
    if( event in this._events === false  )  return this;
    this._events[event].splice(this._events[event].indexOf(fct), 1);
    return this;
  },
  trigger: function(event /* , args... */){
    this._events = this._events || {};
    if( event in this._events === false  )  return;
    for(var i = 0; i < this._events[event].length; i++){
      this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
    }
    return this;
  }
};