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
        'www/static/js/q.js',
        'www/static/js/mustache.js',
        'www/static/js/rq.js',
        'www/static/js/rq.EventEmitter.js',
        'www/static/js/rq.QuestionModel.js',
        'www/static/js/rq.QuestionController.js',
        'www/static/js/rq.QuizUi.js',
        'www/static/js/rq.QuizModel.js',
        'www/static/js/rq.QuizController.js'
      ]
    },
    concat: {
      options: {
        separator: '\n;\n'
      },
      all: {
        files: {
          'www/static/js/all.js': '<%= meta.jsfiles %>'
        }
      }
    },
    jshint: {
      all: [
        'www/static/js/rq.js',
        'www/static/js/rq.EventEmitter.js',
        'www/static/js/rq.QuestionModel.js',
        'www/static/js/rq.QuestionController.js',
        'www/static/js/rq.QuizUi.js',
        'www/static/js/rq.QuizModel.js',
        'www/static/js/rq.QuizController.js'
      ],
      options: {
        curly: true,
        forin: true,
        immed: true,
        indent: 2,
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
        mangle: false,
        sourceMap: 'www/static/js/all.js.map',
        sourceMappingURL: 'all.js.map',
        sourceMapPrefix: 3
      },
      all: {
        files: {
          'www/static/js/all.js': '<%= meta.jsfiles %>'
        }
      }
    },
    sass: {
      dev: {
        options: {
          lineNumbers: true,
          debugInfo: true
        },
        files: {
          'www/static/css/all.css': 'www/static/css/all.scss'
        }
      },
      dist: {
        options: {
          style: 'compressed'
        },
        files: {
          'www/static/css/all.css': 'www/static/css/all.scss'
        }
      }
    },
    watch: {
      scripts: {
        files: '<%= meta.jsfiles %>',
        tasks: ['concat']
      },
      styles: {
        files: 'www/static/css/*.scss',
        tasks: ['sass:dev']
      }
    }
  });

  grunt.registerTask('server', function() {
    require('./index.js');
  });

  grunt.registerTask('buildStatic', function() {
    var done = this.async();
    require('./build-static.js')(done);
  });

  grunt.registerTask('dev', ['concat', 'sass:dev', 'server', 'watch']);
  grunt.registerTask('build', ['concat', 'uglify', 'sass:dist', 'server', 'buildStatic']);

};
