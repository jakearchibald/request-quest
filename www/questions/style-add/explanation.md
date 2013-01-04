According to [the spec](http://www.whatwg.org/specs/web-apps/current-work/multipage/links.html#link-type-stylesheet)…

> The appropriate time to obtain the resource is when the external resource link is created or when its element is inserted into a document, whichever happens last.

…so we wouldn't expect to see a request before the `link` was added to the document.

The specification doesn't cover what to do if the content-type is unsupported for styles, but it's unexpected to see Chrome making the request at this point. Note: it doesn't parse the styles, it just downloads the file.

> The default type for resources given by the stylesheet keyword is text/css.

…so the lack of a `type` attribute doesn't prevent downloading. Once again we see Opera deferring adding downloads to the queue until scripts have finished.