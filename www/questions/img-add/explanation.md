`img` sources are downloaded [as soon as their `src` attribute is set](http://www.whatwg.org/specs/web-apps/current-work/multipage/embedded-content-1.html#dfnReturnLink-0). There's no requirement for them to be in a document.

If you need to quickly trigger an http request and don't care about the response, you can do so with `new Image().src = url;`.