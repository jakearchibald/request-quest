From [the spec](http://www.w3.org/TR/css3-fonts/#font-face-loading):

> User agents that download all fonts defined in @font-face rules without considering whether those fonts are in fact used within a page are considered non-conformant

…but 'Consider' is such a fluffy word.

> In cases where a font might be downloaded in character fallback cases, user agents may download a font if it's listed in a font list but is not actually used for a given text run.

…so all the browsers are doing it right, but Chrome is arguably a little better optimised.

I say 'a little', because we've told the browser up-front that `font.woff` only contains lowercase a-z glyphs, so there's an easy optimisation that's being passed up by all browsers.

Previous versions of the spec didn't allow browsers to download fonts unless a glyph from them was needed, this was relaxed in late 2011.