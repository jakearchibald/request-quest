None of the browsers parse scripts of a type/language they don't recognise, but Firefox, IE and Opera _will_ download them regardless.

[The HTML spec](http://www.whatwg.org/specs/web-apps/current-work/multipage/scripting-1.html#script-processing-prepare) instructs browsers to ignore script elements with an unsupported type, Chrome follows this rule.

If a script element lacks a type/language attribute, `text/javascript` is assumed. This is common browser behaviour and was [later added to the HTML spec](http://www.whatwg.org/specs/web-apps/current-work/multipage/scripting-1.html#script-processing-prepare)

Interestingly, [some script preloaders relied on browsers downloading unrecognised script types](http://blog.getify.com/on-script-loaders/) in order to populate the cache, which no longer works in Chrome.