require('sanic.js').changeMyWorld();
var Server = require('./server.js'),
    log = require('./log.js'),
    stdin = require('./stdin.js'),
    config = require('../etc/config.json'),
    servers = config.servers,
    debugConfig = Object.assign({
        memwatch: false,
        heapDiff: false
    }, config.debug),
    test = function(){
        server.send('PRIVMSG ' + this.channel.name + ' ' + this.argv.join(' '));
    },
    handleStop = function(){
        var self = this;
        setTimeout(function(){
            self.connect();
        }, 5 * 60 * 1000); // 5 minutes
    },
    trend = [],
    server, memwatch, heapDiff, tools, lastSize;
process.title = 'EeeZorBot';
process.on('SIGINT', function(){
    console.log('CTRL-C hit!');
    process.listeners('exit').forEach(function(fn){
        fn();
    });
    process.removeAllListeners('exit');
    process.exit();
});
if(debugConfig.memwatch){
    memwatch = require('node-memwatch');
    memwatch.on('stats', function(stats){
        if(debugConfig.heapDiff){
            if(heapDiff){
                var diff = heapDiff.end();
                log.debug(`Memory changed from ${diff.before.size} to ${diff.after.size}`);
                diff.change.details.forEach(function(item){
                    log.debug(`  ${item.what}: ${item.size}`);
                });
                heapDiff = undefined;
            }else{
                heapDiff = new memwatch.HeapDiff();
            }
        }else{
            if(!tools){
                tools = require('./tools.js');
            }
            log.debug(`Current memory: ${tools.sizeString(stats.current_base || 0)}`);
        }
        var change = stats.current_base - lastSize; // eslint-disable-line one-var
        trend.push(change);
        trend = trend.slice(0, 5);
        if(trend.filter(function(item){
            return item > 0;
        }).length === 5){
            change = trend.reduce(function(total, item){
                return total + item;
            }, 0);
            if(change > 1000){
                log.error(`Memory appears to be leaking. Usage increased by ${tools.sizeString(change)} over the last 5 garbage collections.`);
            }
        }
        lastSize = stats.current_base;
    });
}
servers.forEach(function(server){
    if(server.active){
        try{
            server = new Server(server);
            server
                .add('test', test)
                .on('stop', handleStop)
                .connect();
        }catch(e){
            log.trace(e);
        }
    }
});
stdin.start();
process.on('uncaughtException', function(e){
    log.trace(e);
}).on('exit', function(){
    log.info('Console stopped');
    stdin.stop();
});
if(global !== undefined){
    global.api = require('./api.js');
}
