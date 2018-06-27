const gulp = require("gulp");
const nodemon = require("gulp-nodemon");


gulp.task("default",function(){
   nodemon({
       script: "app.js",
       ext: "js",
       env:{
           PORT:8080
       },
       ignore: ["./node_modules/**"]
   })
       .on("restart",() =>  console.log("restarted"));
});