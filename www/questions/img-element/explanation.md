Browsers download imagery regardless of style, [as per the spec](http://www.whatwg.org/specs/web-apps/current-work/multipage/embedded-content-1.html#dfnReturnLink-0).

This behaviour has been the downfall of many client-side attempts at adaptive imagery, as the original image gets requested before JavaScript can jump in and alter the `src` value.