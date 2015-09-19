module.exports = function(grunt) {

    grunt.initConfig({
        watch: {
            options: {
                livereload: true
            },
            scripts: {
                files: ['**/*.js']
            }
        },
        removelogging: {
            dist: {
                src: ["js/utils.js","js/mainContent/directives/*.js","js*//*.js"],
                dest: "js/appProduction.js"
            }
        }
    });

    grunt.loadNpmTasks("grunt-remove-logging");
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['watch']);

};