var gulp = require('gulp')

var clean = require('gulp-clean')
var livereload = require('gulp-livereload')

var jshint = require('gulp-jshint')
var watchify = require('gulp-watchify')
var uglify = require('gulp-uglify')
var streamify = require('gulp-streamify')
var imagemin = require('gulp-imagemin')
var autoprefixer = require('gulp-autoprefixer')
var csso = require('gulp-csso')
var svgmin = require('gulp-svgmin')
var htmlmin = require('gulp-htmlmin')
var bust = require('gulp-buster')

var HTTP_SERVER_PORT = 9000

/////////////////////////////////////////////////////////////////////////////
// Paths you might care about

var ALL_JS = [
    // All JavaScript files (for syntax validation and linting)
    '*.js',
    'server/**/*.js',
    'client/js/**/*.js'
]
var CLIENT_BUILD = 'build/'

var HTML_SRC = [ 'client/**/*.html' ]
var HTML_DEST = CLIENT_BUILD

var BROWSERIFY_SRC = [
    'client/js/**/*.js',
    "!client/js/**/lib/**" // Don't bundle libs
]
var BROWSERIFY_DEST = CLIENT_BUILD + 'js/'

var CSS_SRC = [
    'client/css/**/*.css',
    "!client/css/**/lib/**" // Don't bundle libs
]
var CSS_DEST = CLIENT_BUILD + 'css/'

var IMAGEMIN_SRC = [
    'client/img/**/*.png',
    'client/img/**/*.gif',
    'client/img/**/*.jpg',
    'client/img/**/*.jpeg'
]
var SVGMIN_SRC = [
    'client/img/**/*.svg'
]
var IMAGE_DEST = CLIENT_BUILD + 'img/'

var STATIC_MANIFEST_FILE = 'manifest.json'
var STATIC_MANIFEST_DEST = CLIENT_BUILD + STATIC_MANIFEST_FILE
var STATIC_MANIFEST_SRC = [
    CLIENT_BUILD + '**/*',
    '!' + STATIC_MANIFEST_DEST
]


/////////////////////////////////////////////////////////////////////////////


// Hack to enable configurable watchify watching
var watching = false
gulp.task('enable-watch-mode', function() { watching = true })

function markAsFailed(err) {
    console.error(err.stack)
    if (watching) {
        console.log("Continuing despite error... (watch mode)")
    } else {
        process.exit(1)
    }
}

// Browserify and copy js files
gulp.task('browserify', watchify(function scriptsTask(watchify) {
    return gulp.src(BROWSERIFY_SRC)
        .pipe(watchify({
            watch:watching,
            setup: function(bundle) {
                bundle.transform(require('ractify'))
            }
        }))
        .pipe(streamify(uglify()))
        .pipe(gulp.dest(BROWSERIFY_DEST))
        .on('error', markAsFailed)
}))

gulp.task('watchify', ['enable-watch-mode', 'browserify'])

// Validate JavaScript
gulp.task('lint-js', function(){
    return gulp.src(ALL_JS)
        .pipe(jshint())
        .pipe(jshint.reporter(require('jshint-stylish')))
        .pipe(jshint.reporter('fail'))
        .on('error', markAsFailed)
})


// Minify and copy all css
gulp.task('css', function() {
    return gulp.src(CSS_SRC)
        .pipe(autoprefixer('last 5 version', 'safari 4', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
        .pipe(csso())
        .pipe(gulp.dest(CSS_DEST))
        .on('error', markAsFailed)
})

// Optimize png/gif/jpg/jpeg
gulp.task('imagemin', function() {
    return gulp.src(IMAGEMIN_SRC)
        // Pass in options to the task
        .pipe(imagemin({optimizationLevel: 5}))
        .pipe(gulp.dest(IMAGE_DEST))
        .on('error', markAsFailed)
})

// Optimize svgs
gulp.task('svgmin', function() {
    return gulp.src(SVGMIN_SRC)
        // Pass in options to the task
        .pipe(svgmin())
        .pipe(gulp.dest(IMAGE_DEST))
        .on('error', markAsFailed)
})


// Minify and copy html files
gulp.task('html', function() {
    return gulp.src(HTML_SRC)
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(gulp.dest(HTML_DEST))
        .on('error', markAsFailed)
})

// Generate hashes
gulp.task('hash-generation', function() {
    return gulp.src(STATIC_MANIFEST_SRC)
        .pipe(bust(STATIC_MANIFEST_FILE))
        .pipe(gulp.dest(CLIENT_BUILD))
})

// Run static HTTP server
gulp.task('static-server', function(next) {
    var http = require('http')
    var NodeStatic = require('node-static')

    var server = new NodeStatic.Server(HTML_DEST)
    var httpServer = http.createServer(function (request, response) {
        request.addListener('end', function () {
            server.serve(request, response)
        }).resume()
    }).listen(HTTP_SERVER_PORT, function() {
            console.log('\nDEVELOPMENT-ONLY file server listening: http://'+httpServer.address().address+":"+httpServer.address().port+'\n')
            next()
        })
})


// Rerun tasks when a file changes
gulp.task('watch', ['enable-watch-mode', 'build', 'validate'], function () {
    gulp.watch(CSS_SRC, ['css'])
    gulp.watch(IMAGEMIN_SRC, ['imagemin'])
    gulp.watch(SVGMIN_SRC, ['svgmin'])
    gulp.watch(HTML_SRC, ['html'])
    gulp.watch(ALL_JS, ['lint-js'])
    gulp.watch(STATIC_MANIFEST_SRC, ['hash-generation'])
    gulp.watch('gulpfile.js', function() {
        console.error("\nWarning! gulpfile.js has changed, but you'll need to restart gulp to see them\n")
    })
})

gulp.task('serve', ['watch', 'static-server', 'livereload-server'])


// Live reload server detects any changes in our build directory
gulp.task('livereload-server', function () {
    var server = livereload()
    gulp.watch(CLIENT_BUILD+'/**/*').on('change', function(file) {
        server.changed(file.path)
    })
})

// clean out built files
gulp.task('clean', function() {
    return gulp.src(CLIENT_BUILD, {read: false})
        .pipe(clean())
        .on('error', markAsFailed)
})

// Build only
gulp.task('build', ['browserify', 'css', 'html', 'imagemin', 'svgmin', 'hash-generation'])

// Build and validate
gulp.task('validate', ['lint-js'])

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['validate', 'build'])