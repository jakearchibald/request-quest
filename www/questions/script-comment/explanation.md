This is a tricky one.

If an HTML comment is written, the `img` element isn't parsed & therefore shouldn't download. However, some browsers optimise by looking ahead and identifying extra requests to make, reducing the performance impact of events that block parsing, such as inline scripts. This is known as [speculative parsing](https://developer.mozilla.org/en-US/docs/HTML/Optimizing_Your_Pages_for_Speculative_Parsing).

Firefox and IE continue to parse the document while the script is executing, they pick up the `img` and trigger a request. The script finishes and the speculative parsing work is discarded along with the `img` element, an html comment is created in its place, but the request has already been made.

Chrome and Opera also speculatively parse, but not when it comes to inline scripts.

The `async` and `defer` attributes [have no effect](http://www.whatwg.org/specs/web-apps/current-work/multipage/scripting-1.html#script-processing-defer) on inline scripts. They were just there to throw you off the scent. Sorry.