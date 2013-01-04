CSS background images differ from `img` elements, they aren't downloaded as soon as the element is parsed.

If an element has `display: none`, calculating styles within that element are a waste of time as they'll never be used, so background images on child elements are never calculated and therefore not downloaded.

Browsers differ when it comes to an element that has its style calculated, but is hidden as a result. IE and Chrome download the image even though it won't be rendered. This suggests that IE and Chrome trigger background image requests when styles are calculated, whereas Firefox and Opera wait until the element is laid out on the page. The Firefox and Opera behaviour is arguably more consistent.

Although `visibility: hidden` and `opacity: 0` makes the background invisible to the user, the element's layout is still calculated, therefore Firefox and Opera download the background.

**TODO:** Anything in the spec(s) about this?