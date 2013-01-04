Ahh the joys of cross-browser development! Here's what [the spec](http://www.whatwg.org/specs/web-apps/current-work/multipage/scripting-1.html#dfnReturnLink-0) has to say:

> When a script element … experiences one of the events listed … the user agent must synchronously prepare the script element:
>
> The script element gets inserted into a document…

Script preparation involves triggering the request.

IE is violating the spec by triggering the request before the script is inserted into the document. Opera violates the spec by asynchronously handling script preparation, waiting until the end of script execution to prepare new scripts.