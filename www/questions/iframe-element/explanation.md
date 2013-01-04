The [spec is clear](http://www.whatwg.org/specs/web-apps/current-work/multipage/the-iframe-element.html#process-the-iframe-attributes) about handling iframes without src element, or empty src elements:

> if the element has no src attribute specified… fire a simple event named load at the iframe element.

A load event is fired even though nothing is loaded.

> Otherwise if the value of the src attribute is the empty string, let url be the string "about:blank".

…so no requests there.

> Otherwise, resolve the value of the src attribute, relative to the iframe element.

…so both "#" and "?" map to urls on the host domain. Except…

> If there exists an ancestor browsing context whose active document's address, ignoring fragment identifiers, is equal to url, then abort these steps.

Chrome violates this part of the spec. "#" is the same url as the parent window if the fragment identifier is ignored.

"?" is a different url to the parent window, so a request is triggered.