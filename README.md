# Does it make a request?

A little quiz where you have to decide if a bit of code causes the browser to make an HTTP request for a particular file.

The quiz isn't ready to be played yet.

# Contributing

Requires:

* Node
* npm
* grunt-cli
* sass

Clone & install other dependencies:

```sh
git clone https://github.com/jakearchibald/request-quest.git
cd request-quest
npm install
```

Run server and watch for changes:

```sh
grunt server watch
```

This will pick up changes to js & css files. If you change index.js you'll have to ctrl+c and run grunt again.

## Running tests

Each quiz question has an automated test, go to http://localhost:3000/test/ to run them all, or http://localhost:3000/test/?iframe to run tests with iframe in the title.

Once a test completes it'll output the code that first triggered the request.

## Writing tests

Create a directory in `www` for your test, `example-test` is provided as (a very small amount of) boilerplate.

The test is defined in `spec.json`

```javascript
{
  // title & subtitle are shown to the user when they see this question
  "title": "An example test",
  "subtitle": "Is script.js requested?",
  // lang can be js or html (obviously html can itself contain js)
  "lang": "js",
  // the file you're waiting for a request for, this file should be in your test folder.
  // This can be '#', which means you're looking for an additional request to the current page
  // Querystrings are ignored
  "expectedRequest": "script.js",
  // Each phase creates a bit of code shown to the user. After a phase they'll
  // be asked if the code creates a request.
  "phases": [
    {
      // adding lines to the code (here we're starting from nothing)
      "addLines": [
        "var whatever;"
      ]
    },
    {
      // removing the line we added in the phase above
      "removeLines": 1,
      // adding a line
      "addLines": [
        "var whatever = 'script.js';"
      ]
    },
    {
      // adding two more lines, retaining the code above
      "addLines": [
        "var script = document.createElement('script');",
        "script.src = whatever;"
      ]
    },
    {
      "addLines": [
        "document.body.appendChild(script);",
        "document.body.removeChild(script);"
      ]
    },
    {
      // you don't have to add lines in a phase, you can just remove them
      "removeLines": 1
    }
  ]
}
```

When you're ready to test your question, add its folder name to `testDirs` in `index.js`.