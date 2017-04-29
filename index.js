module.exports = require('./lib/api.js');
process.on('SIGINT', function(){
    console.log('CTRL-C hit!');
    process.listeners('exit').forEach(function(fn){
        fn();
    });
    process.removeAllListeners('exit');
    process.exit();
});
