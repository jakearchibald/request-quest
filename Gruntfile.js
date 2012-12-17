/*global module:false*/
module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      jsFiles: [
        'www/static/js/1.js',
        'www/static/js/2.js'
      ]
    },
    concat: {
      options: {
        separator: '\n;\n'
      },
      all: {
        src: [
          'www/static/js/1.js',
          'www/static/js/2.js'
        ],
        dest: 'www/static/js/all-dev.js'
      }
    },
    jshint: {
      all: [
        'www/static/js/1.js',
        'www/static/js/2.js'
      ],
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
        devel: true,
        globals: []
      }
    },
    uglify: {
      options: {
        mangle: {
          except: []
        }
      },
      all: {
        src: ['www/static/js/all-dev.js'],
        dest: 'www/static/js/all.js'
      }
    },
    watch: {
      scripts: {
        files: [
          'www/static/js/1.js',
          'www/static/js/2.js'
        ],
        tasks: ['jshint', 'concat']
      }
    }
  });

  // Default task.
  grunt.registerTask('default', ['jshint', 'concat', 'uglify']);
};
