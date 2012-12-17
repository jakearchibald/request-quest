/*global module:false*/
module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-sass');
  
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      jsfiles: [
        'www/static/js/1.js',
        'www/static/js/2.js'
      ]
    },
    concat: {
      options: {
        separator: '\n;\n'
      },
      all: {
        files: {
          'www/static/js/all-dev.js': '<%= meta.jsfiles %>'
        }
      }
    },
    jshint: {
      all: '<%= meta.jsfiles %>',
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
        files: {
          'www/static/js/all.js': 'www/static/js/all-dev.js'
        }
      }
    },
    sass: {
      all: {
        files: {
          'www/static/css/all-dev.css': 'www/static/css/all-dev.scss'
        }
      }
    },
    watch: {
      scripts: {
        files: '<%= meta.jsfiles %>',
        tasks: ['jshint', 'concat']
      },
      styles: {
        files: 'www/static/css/*',
        tasks: ['jshint', 'concat']
      }
    }
  });

  // Default task.
  grunt.registerTask('default', ['jshint', 'concat', 'uglify']);
};
