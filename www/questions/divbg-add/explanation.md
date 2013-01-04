As we've seen with plain HTML, background images aren't downloaded until their style is calculated or laid out, depending on the browser. There's no point doing either of those until the element is in a document.

Inserting and removing an element changes the DOM twice, but since the page isn't rendered in-between (script blocks the rendering thread) the element's styles are never calculated, nor is it laid out.

Calculating the `offsetWidth` of an element triggers layout which triggers style computation. As we saw earlier, this triggers downloads in Chrome and Firefox. Opera however, doesn't download the image at this point, suggesting it doesn't trigger background-image downloads unless layout is triggered by rendering.

The download is triggered earlier in IE, by reading `innerHTML`. This is unusual as `innerHTML` doesn't depend on style at all.

**TODO:** Anything in the spec(s) about this?