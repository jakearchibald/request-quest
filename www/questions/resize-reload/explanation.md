This seems straight forward at first. Triggering the resize event should cause the page to reload right? No, this is a [spec violation](http://www.whatwg.org/specs/web-apps/current-work/multipage/history.html#dom-location-reload)!

> When the reload() method is invoked … If the currently executing task is the dispatch of a resize event in response to the user resizing the browsing context … Repaint the browsing context and abort these steps.

Although the test isn't strictly 'in response to the user resizing', the results are the same as if they were.

So, why is `location.reload()` blocked during a resize event listener? 

Ancient versions of Netscape and IE had really wonky CSS implementations, it was common for them to fail to adapt correctly to window resizes. It became common practice to work around this by triggering a reload on resize. Unfortunately sites with that code [still exist and cause problems](https://bugzilla.mozilla.org/show_bug.cgi?id=201710). The spec recognises reload-on-resize as an anti-pattern and prevents it.