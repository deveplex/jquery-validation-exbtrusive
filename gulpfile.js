/// <binding AfterBuild='publish:jquery-validation-exbtrusive' Clean='clean:jquery-validation-exbtrusive' ProjectOpened='watch:jquery-validation-exbtrusive' />
/*
This file in the main entry point for defining Gulp tasks and using Gulp plugins.
Click here to learn more. http://go.microsoft.com/fwlink/?LinkId=518007
*/
"use strict";

var gulp = require('gulp'),
    $ = require('gulp-load-plugins')(),
    path = require('path'),
    pkg = require('./package.json');

var fileName = pkg.name.replace(/-/g, '.');

var optionset = {
    banner: ['/**',
        ' * <%= pkg.name %> v<%= pkg.version %>',
        ' * <%= pkg.description %>',
        ' * link <%= pkg.homepage %>',
        ' * Copyright (c) 2015-<%= new Date().getFullYear() %> by <%= pkg.author.name %>',
        ' * Released under the <%= pkg.licenses[0].type %> license',
        ' **/\n'].join('\n'),
    bower: "./bower.json",
    jsx: {
        src: [
            './src/jsx/additional/*.jsx',
            '!./src/jsx/additional/*.min.jsx'
        ],
        dest: 'test/js'
    },
    clean: {
        distDest: 'dist/',
        testDest: ['./test/js/']
    },
    publish: {
        jsSrc: './src/jsx/jquery.validation.exbtrusive.json',
        jsDest: 'dist/',
        concat: '' + fileName + '.js'
    }
};

//check
gulp.task('check:script', async () => {
    gulp.src(optionset.jsx.src)
        .pipe($.jshint())
        .pipe($.jshint.reporter('default'))
        .pipe($.babel())
        .pipe($.header(optionset.banner, { pkg: pkg }))
        .pipe(gulp.dest(optionset.jsx.dest));
});

//watch
gulp.task('watch', () => {
    gulp.watch(optionset.jsx.src, gulp.series('check:script'));
});

//clean
gulp.task('clean', async () => {
    gulp.src(optionset.clean.distDest, { allowEmpty: true })
        .pipe($.clean());
});

//publish
gulp.task('publish', async () => {

    gulp.src(optionset.bower)
        .pipe(gulp.dest(optionset.publish.jsDest));

    var jsSrc = require(optionset.publish.jsSrc);
    gulp.src(jsSrc)
        .pipe($.plumber())
        .pipe($.concat(optionset.publish.concat))
        .pipe($.babel())
        //.pipe($.replace(/(\n\r)*/g, ''))
        //.pipe($.rename({ extname: '.js' }))
        .pipe($.header(optionset.banner, { pkg: pkg }))
        .pipe(gulp.dest(optionset.publish.jsDest))
        .pipe($.rename({ suffix: '.min' }))
        .pipe($.uglify())
        .pipe($.header(optionset.banner, { pkg: pkg }))
        .pipe(gulp.dest(optionset.publish.jsDest));
});

gulp.task('default', gulp.series(['clean', 'publish']));