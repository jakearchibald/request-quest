/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: '<json:package.json>',
    meta: {
      jsFiles: [
        'www/static/js/1.js',
        'www/static/js/2.js'
      ]
    },
    lint: {
      files: '<config:meta.jsFiles>'
    },
    concat: {
      dist: {
        src: '<config:meta.jsFiles>',
        dest: 'www/static/js/all-dev.js'
      }
    },
    min: {
      dist: {
        src: '<config:concat.dist.dest>',
        dest: 'www/static/js/all.js'
      }
    },
    watch: {
      files: '<config:meta.jsFiles>',
      tasks: 'lint concat'
    },
    jshint: {
      options: {
        curly: true,
        forin: true,
        immed: true,
        indent: '2',
        latedef: true,
        newcap: true,
        noarg: true,
        nonew: true,
        sub: true,
        undef: true,
        unused: true,
        boss: true,
        eqnull: true,
        browser: true,
        devel: true
      },
      globals: {
      }
    },
    uglify: {}
  });

  // Default task.
  grunt.registerTask('default', 'lint concat min');

};
