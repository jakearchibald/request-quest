// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    // Turn off strict mode for this function so we can assign to global.Q
    /*jshint strict: false*/

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object") {
        definition(void 0, exports);

    // RequireJS
    } else if (typeof define === "function") {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = function () {
                var Q = {};
                return definition(void 0, Q);
            };
        }

    // <script>
    } else {
        definition(void 0, Q = {});
    }

})(function (require, exports) {
"use strict";

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback "defend" and in "allResolved"
var noop = function () {};

// for the security conscious, defend may be a deep freeze as provided
// by cajaVM.  Otherwise we try to provide a shallow freeze just to
// discourage promise changes that are not compatible with secure
// usage.  If Object.freeze does not exist, fall back to doing nothing
// (no op).
var defend = Object.freeze || noop;
if (typeof cajaVM !== "undefined") {
    defend = cajaVM.def;
}

// use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick;
if (typeof process !== "undefined") {
    // node
    nextTick = process.nextTick;
} else if (typeof setImmediate === "function") {
    // In IE10, or use https://github.com/NobleJS/setImmediate
    nextTick = setImmediate;
} else if (typeof MessageChannel !== "undefined") {
    // modern browsers
    // http://www.nonblocking.io/2011/06/windownexttick.html
    var channel = new MessageChannel();
    // linked list of tasks (single, with head node)
    var head = {}, tail = head;
    channel.port1.onmessage = function () {
        head = head.next;
        var task = head.task;
        delete head.task;
        task();
    };
    nextTick = function (task) {
        tail = tail.next = {task: task};
        channel.port2.postMessage(0);
    };
} else {
    // old browsers
    nextTick = function (task) {
        setTimeout(task, 0);
    };
}

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this does have the nice side-effect of reducing the size
// of the code by reducing x.call() to merely x(), eliminating many
// hard-to-minify characters.
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var uncurryThis;
// I have kept both variations because the first is theoretically
// faster, if bind is available.
if (Function.prototype.bind) {
    var Function_bind = Function.prototype.bind;
    uncurryThis = Function_bind.bind(Function_bind.call);
} else {
    uncurryThis = function (f) {
        return function () {
            return f.call.apply(f, arguments);
        };
    };
}

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        keys.push(key);
    }
    return keys;
};

var object_toString = Object.prototype.toString;

// generator related shims

function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible (that is, if in V8), transform the error stack
    // trace by removing Node and Q cruft, then concatenating with
    // the stack trace of the promise we are ``done``ing. See #57.
    if (promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        error.stack = filterStackString(error.stack) +
            "\n" + STACK_JUMP_SEPARATOR + "\n" +
            filterStackString(promise.stack);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line)) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function isInternalFrame(stackLine) {
    var pieces = /at .+ \((.*):(\d+):\d+\)/.exec(stackLine);

    if (!pieces) {
        return false;
    }

    var fileName = pieces[1];
    var lineNumber = pieces[2];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (Error.captureStackTrace) {
        var fileName, lineNumber;

        var oldPrepareStackTrace = Error.prepareStackTrace;

        Error.prepareStackTrace = function (error, frames) {
            fileName = frames[1].getFileName();
            lineNumber = frames[1].getLineNumber();
        };

        // teases call of temporary prepareStackTrace
        // JSHint and Closure Compiler generate known warnings here
        /*jshint expr: true */
        new Error().stack;

        Error.prepareStackTrace = oldPrepareStackTrace;
        qFileName = fileName;
        return lineNumber;
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" && typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative + " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
exports.nextTick = nextTick;

/**
 * Constructs a {promise, resolve} object.
 *
 * The resolver is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke the resolver with any value that is
 * not a function. To reject the promise, invoke the resolver with a rejection
 * object. To put the promise in the same state as another promise, invoke the
 * resolver with that other promise.
 */
exports.defer = defer;
function defer() {
    // if "pending" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the pending array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the ref promise because it handles both fully
    // resolved values and other promises gracefully.
    var pending = [], progressListeners = [], value;

    var deferred = object_create(defer.prototype);
    var promise = object_create(makePromise.prototype);

    promise.promiseSend = function (op, _, __, progress) {
        var args = array_slice(arguments);
        if (pending) {
            pending.push(args);
            if (op === "when" && progress) {
                progressListeners.push(progress);
            }
        } else {
            nextTick(function () {
                value.promiseSend.apply(value, args);
            });
        }
    };

    promise.valueOf = function () {
        if (pending) {
            return promise;
        }
        return value.valueOf();
    };

    if (Error.captureStackTrace) {
        Error.captureStackTrace(promise, defer);

        // Reify the stack into a string by using the accessor; this prevents
        // memory leaks as per GH-111. At the same time, cut off the first line;
        // it's always just "[object Promise]\n", as per the `toString`.
        promise.stack = promise.stack.substring(promise.stack.indexOf("\n") + 1);
    }

    function become(resolvedValue) {
        if (!pending) {
            return;
        }
        value = resolve(resolvedValue);
        array_reduce(pending, function (undefined, pending) {
            nextTick(function () {
                value.promiseSend.apply(value, pending);
            });
        }, void 0);
        pending = void 0;
        progressListeners = void 0;
    }

    defend(promise);

    deferred.promise = promise;
    deferred.resolve = become;
    deferred.reject = function (exception) {
        become(reject(exception));
    };
    deferred.notify = function (progress) {
        if (pending) {
            array_reduce(progressListeners, function (undefined, progressListener) {
                nextTick(function () {
                    progressListener(progress);
                });
            }, void 0);
        }
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};
// XXX deprecated
defer.prototype.node = deprecate(defer.prototype.makeNodeResolver, "node", "makeNodeResolver");

/**
 * @param makePromise {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in makePromise
 */
exports.promise = promise;
function promise(makePromise) {
    var deferred = defer();
    fcall(
        makePromise,
        deferred.resolve,
        deferred.reject,
        deferred.notify
    ).fail(deferred.reject);
    return deferred.promise;
}

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * put(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
exports.makePromise = makePromise;
function makePromise(descriptor, fallback, valueOf, exception) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error("Promise does not support operation: " + op));
        };
    }

    var promise = object_create(makePromise.prototype);

    promise.promiseSend = function (op, resolved /* ...args */) {
        var args = array_slice(arguments, 2);
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.apply(promise, [op].concat(args));
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolved) {
            resolved(result);
        }
    };

    if (valueOf) {
        promise.valueOf = valueOf;
    }

    if (exception) {
        promise.exception = exception;
    }

    defend(promise);

    return promise;
}

// provide thenables, CommonJS/Promises/A
makePromise.prototype.then = function (fulfilled, rejected, progressed) {
    return when(this, fulfilled, rejected, progressed);
};

makePromise.prototype.thenResolve = function (value) {
    return when(this, function () { return value; });
};

// Chainable methods
array_reduce(
    [
        "isResolved", "isFulfilled", "isRejected",
        "when", "spread", "send",
        "get", "put", "del",
        "post", "invoke",
        "keys",
        "apply", "call", "bind",
        "fapply", "fcall", "fbind",
        "all", "allResolved",
        "view", "viewInfo",
        "timeout", "delay",
        "catch", "finally", "fail", "fin", "progress", "end", "done",
        "nfcall", "nfapply", "nfbind",
        "ncall", "napply", "nbind",
        "npost", "ninvoke",
        "nend", "nodeify"
    ],
    function (undefined, name) {
        makePromise.prototype[name] = function () {
            return exports[name].apply(
                exports,
                [this].concat(array_slice(arguments))
            );
        };
    },
    void 0
);

makePromise.prototype.toSource = function () {
    return this.toString();
};

makePromise.prototype.toString = function () {
    return "[object Promise]";
};

defend(makePromise.prototype);

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */
exports.nearer = valueOf;
function valueOf(value) {
    if (isPromise(value)) {
        return value.valueOf();
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
exports.isPromise = isPromise;
function isPromise(object) {
    return object && typeof object.promiseSend === "function";
}

/**
 * @returns whether the given object is a resolved promise.
 */
exports.isResolved = isResolved;
function isResolved(object) {
    return isFulfilled(object) || isRejected(object);
}

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
exports.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(valueOf(object));
}

/**
 * @returns whether the given object is a rejected promise.
 */
exports.isRejected = isRejected;
function isRejected(object) {
    object = valueOf(object);
    return isPromise(object) && 'exception' in object;
}

var rejections = [];
var errors = [];
var errorsDisplayed;
function displayErrors() {
    if (
        !errorsDisplayed &&
        typeof window !== "undefined" &&
        !window.Touch &&
        window.console
    ) {
        // This promise library consumes exceptions thrown in handlers so
        // they can be handled by a subsequent promise.  The rejected
        // promises get added to this array when they are created, and
        // removed when they are handled.
        console.log("Should be empty:", errors);
    }
    errorsDisplayed = true;
}

/**
 * Constructs a rejected promise.
 * @param exception value describing the failure
 */
exports.reject = reject;
function reject(exception) {
    exception = exception || new Error();
    var rejection = makePromise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                var at = array_indexOf(rejections, this);
                if (at !== -1) {
                    errors.splice(at, 1);
                    rejections.splice(at, 1);
                }
            }
            return rejected ? rejected(exception) : reject(exception);
        }
    }, function fallback() {
        return reject(exception);
    }, function valueOf() {
        return this;
    }, exception);
    // note that the error has not been handled
    displayErrors();
    rejections.push(rejection);
    errors.push(exception);
    return rejection;
}

/**
 * Constructs a promise for an immediate reference.
 * @param value immediate reference
 */
exports.begin = resolve; // XXX experimental
exports.resolve = resolve;
exports.ref = deprecate(resolve, "ref", "resolve"); // XXX deprecated, use resolve
function resolve(object) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (isPromise(object)) {
        return object;
    }
    // In order to break infinite recursion or loops between `then` and
    // `resolve`, it is necessary to attempt to extract fulfilled values
    // out of foreign promise implementations before attempting to wrap
    // them as unresolved promises.  It is my hope that other
    // implementations will implement `valueOf` to synchronously extract
    // the fulfillment value from their fulfilled promises.  If the
    // other promise library does not implement `valueOf`, the
    // implementations on primordial prototypes are harmless.
    object = valueOf(object);
    // assimilate thenables, CommonJS/Promises/A
    if (object && typeof object.then === "function") {
        var deferred = defer();
        object.then(deferred.resolve, deferred.reject, deferred.notify);
        return deferred.promise;
    }
    return makePromise({
        "when": function () {
            return object;
        },
        "get": function (name) {
            return object[name];
        },
        "put": function (name, value) {
            object[name] = value;
            return object;
        },
        "del": function (name) {
            delete object[name];
            return object;
        },
        "post": function (name, value) {
            return object[name].apply(object, value);
        },
        "apply": function (self, args) {
            return object.apply(self, args);
        },
        "fapply": function (args) {
            return object.apply(void 0, args);
        },
        "viewInfo": function () {
            var on = object;
            var properties = {};

            function fixFalsyProperty(name) {
                if (!properties[name]) {
                    properties[name] = typeof on[name];
                }
            }

            while (on) {
                Object.getOwnPropertyNames(on).forEach(fixFalsyProperty);
                on = Object.getPrototypeOf(on);
            }
            return {
                "type": typeof object,
                "properties": properties
            };
        },
        "keys": function () {
            return object_keys(object);
        }
    }, void 0, function valueOf() {
        return object;
    });
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
exports.master = master;
function master(object) {
    return makePromise({
        "isDef": function () {}
    }, function fallback() {
        var args = array_slice(arguments);
        return send.apply(void 0, [object].concat(args));
    }, function () {
        return valueOf(object);
    });
}

exports.viewInfo = viewInfo;
function viewInfo(object, info) {
    object = resolve(object);
    if (info) {
        return makePromise({
            "viewInfo": function () {
                return info;
            }
        }, function fallback() {
            var args = array_slice(arguments);
            return send.apply(void 0, [object].concat(args));
        }, function () {
            return valueOf(object);
        });
    } else {
        return send(object, "viewInfo");
    }
}

exports.view = view;
function view(object) {
    return viewInfo(object).when(function (info) {
        var view;
        if (info.type === "function") {
            view = function () {
                return apply(object, void 0, arguments);
            };
        } else {
            view = {};
        }
        var properties = info.properties || {};
        object_keys(properties).forEach(function (name) {
            if (properties[name] === "function") {
                view[name] = function () {
                    return post(object, name, arguments);
                };
            }
        });
        return resolve(view);
    });
}

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
exports.when = when;
function when(value, fulfilled, rejected, progressed) {
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return fulfilled ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (rejected) {
            makeStackTraceLong(exception, resolvedValue);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return progressed ? progressed(value) : value;
    }

    var resolvedValue = resolve(value);
    nextTick(function () {
        resolvedValue.promiseSend("when", function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        });
    });

    // Progress propagator need to be attached in the current tick.
    resolvedValue.promiseSend("when", void 0, void 0, function (value) {
        deferred.notify(_progressed(value));
    });

    return deferred.promise;
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
exports.spread = spread;
function spread(promise, fulfilled, rejected) {
    return when(promise, function (valuesOrPromises) {
        return all(valuesOrPromises).then(function (values) {
            return fulfilled.apply(void 0, values);
        }, rejected);
    }, rejected);
}

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  This presently only works in
 * Firefox/Spidermonkey, however, this code does not cause syntax
 * errors in older engines.  This code should continue to work and
 * will in fact improve over time as the language improves.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 *  - in present implementations of generators, when a generator
 *    function is complete, it throws ``StopIteration``, ``return`` is
 *    a syntax error in the presence of ``yield``, so there is no
 *    observable return value. There is a proposal[1] to add support
 *    for ``return``, which would permit the value to be carried by a
 *    ``StopIteration`` instance, in which case it would fulfill the
 *    promise returned by the asynchronous generator.  This can be
 *    emulated today by throwing StopIteration explicitly with a value
 *    property.
 *
 *  [1]: http://wiki.ecmascript.org/doku.php?id=strawman:async_functions#reference_implementation
 *
 */
exports.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;
            try {
                result = generator[verb](arg);
            } catch (exception) {
                if (isStopIteration(exception)) {
                    return exception.value;
                } else {
                    return reject(exception);
                }
            }
            return when(result, callback, errback);
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "send");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 * Only useful presently in Firefox/SpiderMonkey since generators are
 * implemented.
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
exports['return'] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are resolved and passed as values (`this` is also resolved and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q.resolve(a), Q.resolve(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
exports.promised = promised;
function promised(callback) {
    return function () {
        return all([this, all(arguments)]).spread(function (self, args) {
          return callback.apply(self, args);
        });
    };
}

/**
 * Constructs a promise method that can be used to safely observe resolution of
 * a promise for an arbitrarily named method like "propfind" in a future turn.
 */
exports.sender = deprecate(sender, "sender", "dispatcher"); // XXX deprecated, use dispatcher
exports.Method = deprecate(sender, "Method", "dispatcher"); // XXX deprecated, use dispatcher
function sender(op) {
    return function (object) {
        var args = array_slice(arguments, 1);
        return send.apply(void 0, [object, op].concat(args));
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param ...args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
exports.send = deprecate(send, "send", "dispatch"); // XXX deprecated, use dispatch
function send(object, op) {
    var deferred = defer();
    var args = array_slice(arguments, 2);
    object = resolve(object);
    nextTick(function () {
        object.promiseSend.apply(
            object,
            [op, deferred.resolve].concat(args)
        );
    });
    return deferred.promise;
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
exports.dispatch = dispatch;
function dispatch(object, op, args) {
    var deferred = defer();
    object = resolve(object);
    nextTick(function () {
        object.promiseSend.apply(
            object,
            [op, deferred.resolve].concat(args)
        );
    });
    return deferred.promise;
}

/**
 * Constructs a promise method that can be used to safely observe resolution of
 * a promise for an arbitrarily named method like "propfind" in a future turn.
 *
 * "dispatcher" constructs methods like "get(promise, name)" and "put(promise)".
 */
exports.dispatcher = dispatcher;
function dispatcher(op) {
    return function (object) {
        var args = array_slice(arguments, 1);
        return dispatch(object, op, args);
    };
}

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
exports.get = dispatcher("get");

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
exports.put = dispatcher("put");

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
exports["delete"] = // XXX experimental
exports.del = dispatcher("del");

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
var post = exports.post = dispatcher("post");

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
exports.invoke = function (value, name) {
    var args = array_slice(arguments, 2);
    return post(value, name, args);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param thisp     the `this` object for the call
 * @param args      array of application arguments
 */
// XXX deprecated, use fapply
var apply = exports.apply = deprecate(dispatcher("apply"), "apply", "fapply");

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
var fapply = exports.fapply = dispatcher("fapply");

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param thisp     the `this` object for the call
 * @param ...args   array of application arguments
 */
// XXX deprecated, use fcall
exports.call = deprecate(call, "call", "fcall");
function call(value, thisp) {
    var args = array_slice(arguments, 2);
    return apply(value, thisp, args);
}

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
exports["try"] = fcall; // XXX experimental
exports.fcall = fcall;
function fcall(value) {
    var args = array_slice(arguments, 1);
    return fapply(value, args);
}

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param thisp   the `this` object for the call
 * @param ...args   array of application arguments
 */
exports.bind = deprecate(bind, "bind", "fbind"); // XXX deprecated, use fbind
function bind(value, thisp) {
    var args = array_slice(arguments, 2);
    return function bound() {
        var allArgs = args.concat(array_slice(arguments));
        return apply(value, thisp, allArgs);
    };
}

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
exports.fbind = fbind;
function fbind(value) {
    var args = array_slice(arguments, 1);
    return function fbound() {
        var allArgs = args.concat(array_slice(arguments));
        return fapply(value, allArgs);
    };
}

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually resolved object
 */
exports.keys = dispatcher("keys");

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
exports.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var countDown = promises.length;
        if (countDown === 0) {
            return resolve(promises);
        }
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            if (isFulfilled(promise)) {
                promises[index] = valueOf(promise);
                if (--countDown === 0) {
                    deferred.resolve(promises);
                }
            } else {
                when(promise, function (value) {
                    promises[index] = value;
                    if (--countDown === 0) {
                        deferred.resolve(promises);
                    }
                })
                .fail(deferred.reject);
            }
        }, void 0);
        return deferred.promise;
    });
}

/**
 * Waits for all promises to be resolved, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
exports.allResolved = allResolved;
function allResolved(promises) {
    return when(promises, function (promises) {
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return array_map(promises, resolve);
        });
    });
}

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
exports["catch"] = // XXX experimental
exports.fail = fail;
function fail(promise, rejected) {
    return when(promise, void 0, rejected);
}

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
exports.progress = progress;
function progress(promise, progressed) {
    return when(promise, void 0, void 0, progressed);
}

/**
 * Provides an opportunity to observe the rejection of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
exports["finally"] = // XXX experimental
exports.fin = fin;
function fin(promise, callback) {
    return when(promise, function (value) {
        return when(callback(), function () {
            return value;
        });
    }, function (exception) {
        return when(callback(), function () {
            return reject(exception);
        });
    });
}

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
exports.end = deprecate(done, "end", "done"); // XXX deprecated, use done
exports.done = done;
function done(promise, fulfilled, rejected, progress) {
    function onUnhandledError(error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        nextTick(function () {
            makeStackTraceLong(error, promise);

            if (exports.onerror) {
                exports.onerror(error);
            } else {
                throw error;
            }
        });
    }

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promiseToHandle = fulfilled || rejected || progress ?
        when(promise, fulfilled, rejected, progress) :
        promise;

    fail(promiseToHandle, onUnhandledError);
}

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
exports.timeout = timeout;
function timeout(promise, ms) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        deferred.reject(new Error("Timed out after " + ms + " ms"));
    }, ms);

    when(promise, function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    });

    return deferred.promise;
}

/**
 * Returns a promise for the given value (or promised value) after some
 * milliseconds.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after some
 * time has elapsed.
 */
exports.delay = delay;
function delay(promise, timeout) {
    if (timeout === void 0) {
        timeout = promise;
        promise = void 0;
    }
    var deferred = defer();
    setTimeout(function () {
        deferred.resolve(promise);
    }, timeout);
    return deferred.promise;
}

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      var readFile = require("fs").readFile;
 *      Q.nfapply(readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
exports.nfapply = nfapply;
function nfapply(callback, args) {
    var nodeArgs = array_slice(args);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());

    fapply(callback, nodeArgs).fail(deferred.reject);
    return deferred.promise;
}

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 *
 *      var readFile = require("fs").readFile;
 *      Q.nfcall(readFile, __filename)
 *      .then(function (content) {
 *      })
 *
 */
exports.nfcall = nfcall;
function nfcall(callback/*, ...args */) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());

    fapply(callback, nodeArgs).fail(deferred.reject);
    return deferred.promise;
}

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 *
 *      Q.nfbind(FS.readFile, __filename)("utf-8")
 *      .then(console.log)
 *      .done()
 *
 */
exports.nfbind = nfbind;
function nfbind(callback/*, ...args */) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());

        fapply(callback, nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
}

/**
 * Passes a continuation to a Node function, which is called with a given
 * `this` value and arguments provided as an array, and returns a promise.
 *
 *      var FS = (require)("fs");
 *      Q.napply(FS.readFile, FS, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
exports.napply = deprecate(napply, "napply", "npost");
function napply(callback, thisp, args) {
    return nbind(callback, thisp).apply(void 0, args);
}

/**
 * Passes a continuation to a Node function, which is called with a given
 * `this` value and arguments provided individually, and returns a promise.
 *
 *      var FS = (require)("fs");
 *      Q.ncall(FS.readFile, FS, __filename)
 *      .then(function (content) {
 *      })
 *
 */
exports.ncall = deprecate(ncall, "ncall", "ninvoke");
function ncall(callback, thisp /*, ...args*/) {
    var args = array_slice(arguments, 2);
    return napply(callback, thisp, args);
}

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 *
 *      Q.nbind(FS.readFile, FS)(__filename)
 *      .then(console.log)
 *      .done()
 *
 */
exports.nbind = deprecate(nbind, "nbind", "nfbind");
function nbind(callback /* thisp, ...args*/) {
    if (arguments.length > 1) {
        var thisp = arguments[1];
        var args = array_slice(arguments, 2);

        var originalCallback = callback;
        callback = function () {
            var combinedArgs = args.concat(array_slice(arguments));
            return originalCallback.apply(thisp, combinedArgs);
        };
    }
    return function () {
        var deferred = defer();
        var args = array_slice(arguments);
        // add a continuation that resolves the promise
        args.push(deferred.makeNodeResolver());
        // trap exceptions thrown by the callback
        fapply(callback, args)
        .fail(deferred.reject);
        return deferred.promise;
    };
}

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
exports.npost = npost;
function npost(object, name, args) {
    var nodeArgs = array_slice(args);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());

    post(object, name, nodeArgs).fail(deferred.reject);
    return deferred.promise;
}

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
exports.ninvoke = ninvoke;
function ninvoke(object, name /*, ...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());

    post(object, name, nodeArgs).fail(deferred.reject);
    return deferred.promise;
}

exports.nend = deprecate(nodeify, "nend", "nodeify"); // XXX deprecated, use nodeify
exports.nodeify = nodeify;
function nodeify(promise, nodeback) {
    if (nodeback) {
        promise.then(function (value) {
            nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return promise;
    }
}

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

});

;
/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */

/*global define: false*/

(function (root, factory) {
  if (typeof exports === "object" && exports) {
    module.exports = factory; // CommonJS
  } else if (typeof define === "function" && define.amd) {
    define(factory); // AMD
  } else {
    root.Mustache = factory; // <script>
  }
}(this, (function () {

  var exports = {};

  exports.name = "mustache.js";
  exports.version = "0.7.2";
  exports.tags = ["{{", "}}"];

  exports.Scanner = Scanner;
  exports.Context = Context;
  exports.Writer = Writer;

  var whiteRe = /\s*/;
  var spaceRe = /\s+/;
  var nonSpaceRe = /\S/;
  var eqRe = /\s*=/;
  var curlyRe = /\s*\}/;
  var tagRe = /#|\^|\/|>|\{|&|=|!/;

  // Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
  // See https://github.com/janl/mustache.js/issues/189
  function testRe(re, string) {
    return RegExp.prototype.test.call(re, string);
  }

  function isWhitespace(string) {
    return !testRe(nonSpaceRe, string);
  }

  var isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };

  function escapeRe(string) {
    return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
  }

  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };

  function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }

  // Export the escaping function so that the user may override it.
  // See https://github.com/janl/mustache.js/issues/244
  exports.escape = escapeHtml;

  function Scanner(string) {
    this.string = string;
    this.tail = string;
    this.pos = 0;
  }

  /**
   * Returns `true` if the tail is empty (end of string).
   */
  Scanner.prototype.eos = function () {
    return this.tail === "";
  };

  /**
   * Tries to match the given regular expression at the current position.
   * Returns the matched text if it can match, the empty string otherwise.
   */
  Scanner.prototype.scan = function (re) {
    var match = this.tail.match(re);

    if (match && match.index === 0) {
      this.tail = this.tail.substring(match[0].length);
      this.pos += match[0].length;
      return match[0];
    }

    return "";
  };

  /**
   * Skips all text until the given regular expression can be matched. Returns
   * the skipped string, which is the entire tail if no match can be made.
   */
  Scanner.prototype.scanUntil = function (re) {
    var match, pos = this.tail.search(re);

    switch (pos) {
    case -1:
      match = this.tail;
      this.pos += this.tail.length;
      this.tail = "";
      break;
    case 0:
      match = "";
      break;
    default:
      match = this.tail.substring(0, pos);
      this.tail = this.tail.substring(pos);
      this.pos += pos;
    }

    return match;
  };

  function Context(view, parent) {
    this.view = view;
    this.parent = parent;
    this.clearCache();
  }

  Context.make = function (view) {
    return (view instanceof Context) ? view : new Context(view);
  };

  Context.prototype.clearCache = function () {
    this._cache = {};
  };

  Context.prototype.push = function (view) {
    return new Context(view, this);
  };

  Context.prototype.lookup = function (name) {
    var value = this._cache[name];

    if (!value) {
      if (name === ".") {
        value = this.view;
      } else {
        var context = this;

        while (context) {
          if (name.indexOf(".") > 0) {
            var names = name.split("."), i = 0;

            value = context.view;

            while (value && i < names.length) {
              value = value[names[i++]];
            }
          } else {
            value = context.view[name];
          }

          if (value != null) {
            break;
          }

          context = context.parent;
        }
      }

      this._cache[name] = value;
    }

    if (typeof value === "function") {
      value = value.call(this.view);
    }

    return value;
  };

  function Writer() {
    this.clearCache();
  }

  Writer.prototype.clearCache = function () {
    this._cache = {};
    this._partialCache = {};
  };

  Writer.prototype.compile = function (template, tags) {
    var fn = this._cache[template];

    if (!fn) {
      var tokens = exports.parse(template, tags);
      fn = this._cache[template] = this.compileTokens(tokens, template);
    }

    return fn;
  };

  Writer.prototype.compilePartial = function (name, template, tags) {
    var fn = this.compile(template, tags);
    this._partialCache[name] = fn;
    return fn;
  };

  Writer.prototype.compileTokens = function (tokens, template) {
    var fn = compileTokens(tokens);
    var self = this;

    return function (view, partials) {
      if (partials) {
        if (typeof partials === "function") {
          self._loadPartial = partials;
        } else {
          for (var name in partials) {
            self.compilePartial(name, partials[name]);
          }
        }
      }

      return fn(self, Context.make(view), template);
    };
  };

  Writer.prototype.render = function (template, view, partials) {
    return this.compile(template)(view, partials);
  };

  Writer.prototype._section = function (name, context, text, callback) {
    var value = context.lookup(name);

    switch (typeof value) {
    case "object":
      if (isArray(value)) {
        var buffer = "";

        for (var i = 0, len = value.length; i < len; ++i) {
          buffer += callback(this, context.push(value[i]));
        }

        return buffer;
      }

      return value ? callback(this, context.push(value)) : "";
    case "function":
      var self = this;
      var scopedRender = function (template) {
        return self.render(template, context);
      };

      var result = value.call(context.view, text, scopedRender);
      return result != null ? result : "";
    default:
      if (value) {
        return callback(this, context);
      }
    }

    return "";
  };

  Writer.prototype._inverted = function (name, context, callback) {
    var value = context.lookup(name);

    // Use JavaScript's definition of falsy. Include empty arrays.
    // See https://github.com/janl/mustache.js/issues/186
    if (!value || (isArray(value) && value.length === 0)) {
      return callback(this, context);
    }

    return "";
  };

  Writer.prototype._partial = function (name, context) {
    if (!(name in this._partialCache) && this._loadPartial) {
      this.compilePartial(name, this._loadPartial(name));
    }

    var fn = this._partialCache[name];

    return fn ? fn(context) : "";
  };

  Writer.prototype._name = function (name, context) {
    var value = context.lookup(name);

    if (typeof value === "function") {
      value = value.call(context.view);
    }

    return (value == null) ? "" : String(value);
  };

  Writer.prototype._escaped = function (name, context) {
    return exports.escape(this._name(name, context));
  };

  /**
   * Low-level function that compiles the given `tokens` into a function
   * that accepts three arguments: a Writer, a Context, and the template.
   */
  function compileTokens(tokens) {
    var subRenders = {};

    function subRender(i, tokens, template) {
      if (!subRenders[i]) {
        var fn = compileTokens(tokens);
        subRenders[i] = function (writer, context) {
          return fn(writer, context, template);
        };
      }

      return subRenders[i];
    }

    return function (writer, context, template) {
      var buffer = "";
      var token, sectionText;

      for (var i = 0, len = tokens.length; i < len; ++i) {
        token = tokens[i];

        switch (token[0]) {
        case "#":
          sectionText = template.slice(token[3], token[5]);
          buffer += writer._section(token[1], context, sectionText, subRender(i, token[4], template));
          break;
        case "^":
          buffer += writer._inverted(token[1], context, subRender(i, token[4], template));
          break;
        case ">":
          buffer += writer._partial(token[1], context);
          break;
        case "&":
          buffer += writer._name(token[1], context);
          break;
        case "name":
          buffer += writer._escaped(token[1], context);
          break;
        case "text":
          buffer += token[1];
          break;
        }
      }

      return buffer;
    };
  }

  /**
   * Forms the given array of `tokens` into a nested tree structure where
   * tokens that represent a section have two additional items: 1) an array of
   * all tokens that appear in that section and 2) the index in the original
   * template that represents the end of that section.
   */
  function nestTokens(tokens) {
    var tree = [];
    var collector = tree;
    var sections = [];

    var token;
    for (var i = 0, len = tokens.length; i < len; ++i) {
      token = tokens[i];
      switch (token[0]) {
      case '#':
      case '^':
        sections.push(token);
        collector.push(token);
        collector = token[4] = [];
        break;
      case '/':
        var section = sections.pop();
        section[5] = token[2];
        collector = sections.length > 0 ? sections[sections.length - 1][4] : tree;
        break;
      default:
        collector.push(token);
      }
    }

    return tree;
  }

  /**
   * Combines the values of consecutive text tokens in the given `tokens` array
   * to a single token.
   */
  function squashTokens(tokens) {
    var squashedTokens = [];

    var token, lastToken;
    for (var i = 0, len = tokens.length; i < len; ++i) {
      token = tokens[i];
      if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
        lastToken[1] += token[1];
        lastToken[3] = token[3];
      } else {
        lastToken = token;
        squashedTokens.push(token);
      }
    }

    return squashedTokens;
  }

  function escapeTags(tags) {
    return [
      new RegExp(escapeRe(tags[0]) + "\\s*"),
      new RegExp("\\s*" + escapeRe(tags[1]))
    ];
  }

  /**
   * Breaks up the given `template` string into a tree of token objects. If
   * `tags` is given here it must be an array with two string values: the
   * opening and closing tags used in the template (e.g. ["<%", "%>"]). Of
   * course, the default is to use mustaches (i.e. Mustache.tags).
   */
  exports.parse = function (template, tags) {
    template = template || '';
    tags = tags || exports.tags;

    if (typeof tags === 'string') tags = tags.split(spaceRe);
    if (tags.length !== 2) {
      throw new Error('Invalid tags: ' + tags.join(', '));
    }

    var tagRes = escapeTags(tags);
    var scanner = new Scanner(template);

    var sections = [];     // Stack to hold section tokens
    var tokens = [];       // Buffer to hold the tokens
    var spaces = [];       // Indices of whitespace tokens on the current line
    var hasTag = false;    // Is there a {{tag}} on the current line?
    var nonSpace = false;  // Is there a non-space char on the current line?

    // Strips all whitespace tokens array for the current line
    // if there was a {{#tag}} on it and otherwise only space.
    function stripSpace() {
      if (hasTag && !nonSpace) {
        while (spaces.length) {
          tokens.splice(spaces.pop(), 1);
        }
      } else {
        spaces = [];
      }

      hasTag = false;
      nonSpace = false;
    }

    var start, type, value, chr;
    while (!scanner.eos()) {
      start = scanner.pos;
      value = scanner.scanUntil(tagRes[0]);

      if (value) {
        for (var i = 0, len = value.length; i < len; ++i) {
          chr = value.charAt(i);

          if (isWhitespace(chr)) {
            spaces.push(tokens.length);
          } else {
            nonSpace = true;
          }

          tokens.push(["text", chr, start, start + 1]);
          start += 1;

          if (chr === "\n") {
            stripSpace(); // Check for whitespace on the current line.
          }
        }
      }

      start = scanner.pos;

      // Match the opening tag.
      if (!scanner.scan(tagRes[0])) {
        break;
      }

      hasTag = true;
      type = scanner.scan(tagRe) || "name";

      // Skip any whitespace between tag and value.
      scanner.scan(whiteRe);

      // Extract the tag value.
      if (type === "=") {
        value = scanner.scanUntil(eqRe);
        scanner.scan(eqRe);
        scanner.scanUntil(tagRes[1]);
      } else if (type === "{") {
        var closeRe = new RegExp("\\s*" + escapeRe("}" + tags[1]));
        value = scanner.scanUntil(closeRe);
        scanner.scan(curlyRe);
        scanner.scanUntil(tagRes[1]);
        type = "&";
      } else {
        value = scanner.scanUntil(tagRes[1]);
      }

      // Match the closing tag.
      if (!scanner.scan(tagRes[1])) {
        throw new Error('Unclosed tag at ' + scanner.pos);
      }

      // Check section nesting.
      if (type === '/') {
        if (sections.length === 0) {
          throw new Error('Unopened section "' + value + '" at ' + start);
        }

        var section = sections.pop();

        if (section[1] !== value) {
          throw new Error('Unclosed section "' + section[1] + '" at ' + start);
        }
      }

      var token = [type, value, start, scanner.pos];
      tokens.push(token);

      if (type === '#' || type === '^') {
        sections.push(token);
      } else if (type === "name" || type === "{" || type === "&") {
        nonSpace = true;
      } else if (type === "=") {
        // Set the tags for the next time around.
        tags = value.split(spaceRe);

        if (tags.length !== 2) {
          throw new Error('Invalid tags at ' + start + ': ' + tags.join(', '));
        }

        tagRes = escapeTags(tags);
      }
    }

    // Make sure there are no open sections when we're done.
    var section = sections.pop();
    if (section) {
      throw new Error('Unclosed section "' + section[1] + '" at ' + scanner.pos);
    }

    return nestTokens(squashTokens(tokens));
  };

  // The high-level clearCache, compile, compilePartial, and render functions
  // use this default writer.
  var _writer = new Writer();

  /**
   * Clears all cached templates and partials in the default writer.
   */
  exports.clearCache = function () {
    return _writer.clearCache();
  };

  /**
   * Compiles the given `template` to a reusable function using the default
   * writer.
   */
  exports.compile = function (template, tags) {
    return _writer.compile(template, tags);
  };

  /**
   * Compiles the partial with the given `name` and `template` to a reusable
   * function using the default writer.
   */
  exports.compilePartial = function (name, template, tags) {
    return _writer.compilePartial(name, template, tags);
  };

  /**
   * Compiles the given array of tokens (the output of a parse) to a reusable
   * function using the default writer.
   */
  exports.compileTokens = function (tokens, template) {
    return _writer.compileTokens(tokens, template);
  };

  /**
   * Renders the `template` with the given `view` and `partials` using the
   * default writer.
   */
  exports.render = function (template, view, partials) {
    return _writer.render(template, view, partials);
  };

  // This is here for backwards compatibility with 0.4.x.
  exports.to_html = function (template, view, partials, send) {
    var result = exports.render(template, view, partials);

    if (typeof send === "function") {
      send(result);
    } else {
      return result;
    }
  };

  return exports;

}())));

;
var rq = {};

rq.get = function(url) {
  var deferred = Q.defer();
  var req = new XMLHttpRequest();
  
  req.open('get', url);
  req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
  
  req.addEventListener('load', function() {
    deferred.resolve(req);
  });

  req.addEventListener('error', function() {
    deferred.reject(req);
  });

  req.send();
  return deferred.promise;
};

rq.getJson = function(url) {
  return rq.get(url).then(function(req) {
    return JSON.parse(req.responseText);
  });
};
;
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
    if (!event) {
      // remove all
      delete this._events;
      return this;
    }
    if (!fct) {
      // remove all for an event name
      delete this._events[event];
      return this;
    }
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
;
(function() {
  function QuestionModel(data) {
    this.id          = data.id;
    this.title       = data.title;
    this.subtitle    = data.subtitle;
    this.lang        = data.lang;
    this.explanation = data.explanation;

    // expand each of the phases
    var lines = [];
    this.phases = data.phases.map(function(phase) {
      if (phase.removeLines) {
        lines.splice(-phase.removeLines);
      }
      if (phase.addLines) {
        lines.push.apply(lines, phase.addLines);
      }
      return lines.join('\n');
    });

    this.browserAnswer = data.answer;
    this.playerAnswer = {};
    this.score = 0;
    this.maxScore = Object.keys(data.answer).length;
  }

  var QuestionModelProto = QuestionModel.prototype;

  QuestionModelProto.reset = function() {
    this.score = 0;
    this.playerAnswer = {};
  };

  QuestionModelProto.answer = function(phaseNum, browsers) {
    var questionModel = this;
    // set answer for each phaseNum
    // phaseNum should be -1 to mean "does not request"
    browsers.forEach(function(browser) {
      questionModel.playerAnswer[browser] = phaseNum;
    });

    questionModel.calcScore_();
  };

  QuestionModelProto.calcScore_ = function() {
    // recalculate score
    this.score = 0;

    for (var browser in this.browserAnswer) {
      if (this.browserAnswer[browser] == this.playerAnswer[browser]) {
        this.score++;
      }
    }
  };

  QuestionModelProto.passRemaining = function() {
    var questionModel = this;

    questionModel.remainingBrowsers().forEach(function(browser) {
      questionModel.playerAnswer[browser] = -1;
    });
    questionModel.calcScore_();
  };

  QuestionModelProto.answerRemaining = function(phaseNum) {
    var questionModel = this;

    questionModel.remainingBrowsers().forEach(function(browser) {
      questionModel.playerAnswer[browser] = phaseNum;
    });
    questionModel.calcScore_();
  };

  QuestionModelProto.remainingBrowsers = function() {
    var browsers = [];

    for (var browser in this.browserAnswer) {
      if (!(browser in this.playerAnswer)) {
        browsers.push(browser);
      }
    }
    return browsers;
  };

  QuestionModelProto.answered = function() {
    // is the question fully answered or passed?
    for (var browser in this.browserAnswer) {
      if (!(browser in this.playerAnswer)) {
        return false;
      }
    }
    return true;
  };

  // Return an array of { phase{String}, browserAnswer{Array}, playerAnswer{Array} }
  // for each bit of code that first triggered a browser request or the player answered
  QuestionModelProto.answerBreakdown = function() {
    var breakdown = [];
    var answersRemaining = Object.keys(this.browserAnswer).length * 2; // correct answer & player answer
    var browserAnswer;
    var playerAnswer;

    for (var i = 0, len = this.phases.length; i < len; i++) {
      browserAnswer = [];
      playerAnswer = [];

      for (var browser in this.browserAnswer) {
        if (this.browserAnswer[browser] === i) {
          browserAnswer.push(browser);
          answersRemaining--;
        }
        if (this.playerAnswer[browser] === i) {
          playerAnswer.push(browser);
          answersRemaining--;
        }
      }

      if (browserAnswer.length || playerAnswer.length) {
        breakdown.push({
          phase: this.phases[i],
          browserAnswer: browserAnswer,
          playerAnswer: playerAnswer
        });

        if (!answersRemaining) {
          break;
        }
      }
    }

    return breakdown;
  };

  rq.QuestionModel = QuestionModel;
})();
;
(function() {
  function QuestionController(questionModel, quizUi) {
    var questionController = this;
    questionController.listeners_ = [];
    questionController.phase_ = -1;
    questionController.ui_ = quizUi;
    questionController.model_ = questionModel;

    // user has finished reading the solution and wants to continue
    questionController.uiOn_('continueBtnSelected', questionController.end_.bind(questionController));
    
    questionController.uiOn_('answerYes', function() {
      questionModel.answerRemaining(questionController.phase_);
      questionController.showAnswer_();
      questionController.trigger('answerGiven');
    });

    questionController.uiOn_('answerNo', function() {
      questionController.nextPhase_();
      questionController.trigger('answerGiven');
    });

    // User wants to decide on particular browsers
    questionController.uiOn_('answerSome', function() {
      quizUi.showBrowserChoices(questionModel.remainingBrowsers());
    });

    // User selected particular browsers
    questionController.uiOn_('answerThose', function(browsers) {
      questionModel.answer(questionController.phase_, browsers);
      if (questionModel.answered()) {
        questionController.showAnswer_();
      }
      else {
        questionController.nextPhase_();
      }

      questionController.trigger('answerGiven');
    });
  }

  var QuestionControllerProto = QuestionController.prototype = Object.create(rq.EventEmitter.prototype);

  QuestionControllerProto.start = function() {
    this.ui_.showQuestion(this.model_.title, this.model_.subtitle);
    this.nextPhase_();
  };

  QuestionControllerProto.uiOn_ = function(type, func) {
    this.listeners_.push([type, func]);
    this.ui_.on(type, func);
  };

  QuestionControllerProto.removeUiListeners_ = function() {
    var questionController = this;
    questionController.listeners_.forEach(function(listener) {
      questionController.ui_.off(listener[0], listener[1]);
    });
  };

  QuestionControllerProto.nextPhase_ = function() {
    this.phase_++;
    var phaseCode = this.model_.phases[this.phase_];

    if (phaseCode) {
      this.ui_.showPhaseCode(this.model_.phases[this.phase_]);
    }
    else {
      // no phases left
      this.showAnswer_();
    }
  };

  QuestionControllerProto.showAnswer_ = function() {
    this.ui_.showAnswer(this.model_.title, this.model_.score, this.model_.answerBreakdown(), this.model_.explanation);
  };

  QuestionControllerProto.end_ = function() {
    this.removeUiListeners_();
    this.trigger('continue');
    this.off(); // remove all listeners to clean up
  };

  rq.QuestionController = QuestionController;
})();
;
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
;
(function() {
  var localStorageKey = 'rq1';

  function QuizModel(data) {
    this.questions = data.map(function(questionSpec) {
      return new rq.QuestionModel(questionSpec);
    });
    this.score_ = 0;
  }

  var QuizModelProto = QuizModel.prototype;

  Object.defineProperty(QuizModelProto, 'score', { get: function() {
    return this.questions.reduce(function(total, question) {
      return total + question.score;
    }, 0);
  }});

  Object.defineProperty(QuizModelProto, 'maxScore', { get: function() {
    return this.questions.reduce(function(total, question) {
      return total + question.maxScore;
    }, 0);
  }});

  // save user progress to local storage
  // In format { question.id: {
  //   'playerAnswer': question.playerAnswer,
  //   'score': question.score
  // }}
  QuizModelProto.save = function() {
    var progress = {};
    
    this.questions.forEach(function(question) {
      progress[question.id] = {
        playerAnswer: question.playerAnswer,
        score: question.score
      };
    });

    try {
      localStorage.setItem(localStorageKey, JSON.stringify(progress));
    }
    catch(e) { // probably should do something smart here
    }
  };

  // load user progress from local storage
  // returns true if game-in-progress loaded
  QuizModelProto.load = function() {
    var progress;
    var gameInProgress = false;

    try {
      progress = JSON.parse(localStorage.getItem(localStorageKey));
    }
    catch(e) { // probably should do something smart here
    }

    // key not created yet
    if (!progress) { return; }

    this.questions.forEach(function(question) {
      var data = progress[question.id];
      if (data) {
        gameInProgress = gameInProgress || !!Object.keys(data.playerAnswer)[0];
        question.playerAnswer = data.playerAnswer;
        question.score = data.score;
      }
    });

    return gameInProgress;
  };

  QuizModelProto.reset = function() {
    try {
      localStorage.removeItem(localStorageKey);
    }
    catch(e) { // probably should do something smart here
    }

    this.questions.forEach(function(question) {
      question.reset();
    });
  };

  rq.QuizModel = QuizModel;
})();
;
(function() {
  function QuizController() {
    var quizController = this;

    quizController.ready_ = rq.getJson('quiz-data.json').then(function(data) {
      quizController.model_ = new rq.QuizModel(data);
      quizController.ui_ = new rq.QuizUi();

      quizController.gameInProgress_ = quizController.model_.load();

      // user wants to start the quiz
      quizController.ui_.on('startQuizBtnSelected', quizController.nextQuestion_.bind(quizController));
      quizController.ui_.on('restartQuizBtnSelected', function() {
        quizController.model_.reset();
        quizController.nextQuestion_();
      });
    });

    quizController.questionNum_ = -1;
    quizController.gameInProgress_ = false;
  }

  var QuizControllerProto = QuizController.prototype;

  QuizControllerProto.start = function() {
    var quizController = this;
    quizController.ready_.done(function() {
      quizController.ui_.showIntro(quizController.gameInProgress_);
    });
  };

  QuizControllerProto.nextQuestion_ = function() {
    this.questionNum_++;
    this.model_.save();

    var question = this.model_.questions[this.questionNum_];

    if (!question) {
      this.results_();
      return;
    }

    if (question.answered()) {
      this.nextQuestion_();
      return;
    }

    var questionController = new rq.QuestionController(question, this.ui_);
    questionController.on('continue', this.nextQuestion_.bind(this));
    questionController.on('answerGiven', this.model_.save.bind(this.model_));
    questionController.start();
  };

  QuizControllerProto.results_ = function() {
    this.ui_.showFinalResults(this.model_.score, this.model_.maxScore);
  };

  rq.QuizController = QuizController;
}());