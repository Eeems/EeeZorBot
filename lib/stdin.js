/**
 * stdin control
 * @module stdin
 * @class stdin
 * @static
 */
var tools = require('./tools.js'),
    Script = require('./script.js'),
    mods = tools.mods('stdin'),
    commands = [],
    i,
    path,
    config = (function(){
        var c = require('../etc/config.json').stdin,
            d = {
                console: true,
                levels: {
                    log: true,
                    info: true,
                    warn: true,
                    error: true,
                    trace: true,
                    dir: true,
                    debug: false
                },
                scripts: []
            },
            i,
            ii;
        for(i in d){
            if(c[i] === undefined){
                c[i] = d[i];
            }else if(typeof d[i] == 'object'){
                for(ii in d[i]){
                    if(c[i][ii] === undefined){
                        c[i][ii] = d[i][ii];
                    }
                }
            }
        }
        return c;
    })(),
    stdin = {
        id: 'stdin',
        /**
         * Start listening for user input
         * @method start
         * @chainable
         */
        start: function(){
            if(config.console){
                process.stdin.resume();
                process.stdin.setEncoding('utf8');
            }
            return this;
        },
        /**
         * Stop waiting for user input
         * @method stop
         * @chainable
         */
        stop: function(){
            if(config.console){
                process.stdin.pause();
            }
            return this;
        },
        /**
         * Register an event listener
         * @method on
         * @param {string} event Event name
         * @param {function} callback Callback to run
         * @chainable
         */
        on: function(event, callback){
            process.stdin.on(event, async function(){
                if(config.console){
                    return callback.apply(this, arguments);
                }
            });
            return this;
        },
        /**
         * Adds a command to the stdin
         * @method add
         * @param {string} name name for the command
         * @param {function} callback callback to run when command is entered
         * @param {string} [info] Command help line
         * @chainable
         */
        add: function(name, callback, info){
            if(config.console){
                stdin.console('info', ' |  |- command ' + name);
                commands.push({
                    name: name,
                    fn: callback,
                    info: info === undefined ? '' : info
                });
            }
            return this;
        },
        /**
         * Calls a console output method
         * @method console
         * @param {string} method The method to call
         * @param {array} [args]* The arguments to pass
         * @chainable
         */
        console: function(method){
            if(config.levels[method] && global.console !== undefined && global.console[method] !== undefined){
                global.console[method].apply(global.console, [].slice.call(arguments, 1));
            }
            return this;
        },
        /**
         * stdin config
         * @type {object}
         * @property config
         */
        config: config,
        scripts: [],
        run: function(id, fn){
            fn();
        },
        debug: function(){
            var args = ['log'], i;
            for(i in arguments){
                args.push(arguments[i]);
            }
            return this.console.apply(this, args);
        },
        off: function(id){},
        remove: function(id){}
    };
module.exports = stdin;
process.stdin.on('data', function(d){
    if(config.console){
        var i, f = false,
            argv = (d + '').split(' ');
        for(i = 0; i < argv.length; i++){
            argv[i] = argv[i].trim();
        }
        argv = argv.filter(function(n){
            return n;
        });
        for(i = 0; i < commands.length; i++){
            if(argv[0] === commands[i].name){
                f = true;
                try{
                    commands[i].fn(argv);
                }catch(e){
                    stdin.console('error', e);
                }
            }
        }
        !f && stdin.console('log', 'Command not found.');
    }
});
stdin.console('info', 'Loading stdin scripts');
stdin.console('info', ' |- lib/stdin.js');
stdin.add('help', function(argv){
    var m = '',
        i;
    if(argv.length === 1){
        for(i = 0; i < commands.length; i++){
            m += commands[i].name + ' ';
        }
        stdin.console('log', 'Available commands:');
        stdin.console('log', m);
    }else{
        for(i = 0; i < commands.length; i++){
            if(commands[i].name === argv[1]){
                stdin.console('log', commands[i].name + ': ' + commands[i].info);
            }
        }
    }
}, 'Lists all help topics, or lists information on a specific topic')
    .add('exit', function(){
        process.exit();
    }, 'Quits the bot')
    .add('debug', function(){
        stdin.stop();
        stdin.console('log', 'Starting debugger');
        var repl = require('repl').start({
            terminal: true,
            useColor: true,
            useGlobal: true
        });
        repl.on('exit', function(){
            stdin.console('log', 'Debugger exiting');
            stdin.start();
        });
    }, 'Starts the debugger')
    .add('raw', function(argv){
        argv.shift();
        require('./servers.js')[argv.shift()].send(argv.join(' '));
    }, 'Runs a command on a server.')
    .add('reconnect', function(argv){
        if(argv.length > 1){
            var servers = require('./servers.js'),
                id = argv[1];
            if(isNaN(argv[1]) || servers.length < id || id < 0){
                stdin.console('log', 'Invalid server id');
            }else{
                var server = servers[id]; // eslint-disable-line one-var
                stdin.console('log', 'Reconnecting to ' + server.config.nick + '@' + server.config.host);
                server.reconnect();
            }
        }else{
            stdin.console('log', 'You must specify a server id');
        }
    }, 'Reconnects to a server')
    .add('config', function(argv){
        var config = stdin.config.levels,
            i,
            l = function(id){
                stdin.console('log', i + ': ' + (config[id] ? 'on' : 'off'));
            };
        if(argv.length > 1){
            i = argv[1];
            if(typeof config[i] === 'undefined'){
                stdin.console('log', 'Invalid config name');
            }else{
                if(argv.length > 2){
                    var v = argv[2].toLowerCase(); // eslint-disable-line one-var
                    if(['on', '1', 'true', 'y', 't'].indexOf(v) !== -1){
                        config[i] = true;
                    }else if(['off', '0', 'false', 'n', 'f'].indexOf(v) !== -1){
                        config[i] = false;
                    }else{
                        stdin.console('log', 'Invalid config value');
                    }
                }else{
                    l(i);
                }
            }
        }else{
            for(i in config){
                if(i !== 'log'){
                    l(i);
                }
            }
        }
    }, 'Displays and changes stdin config information')
    .add('info', function(argv){
        var servers = require('./servers.js'),
            i, server;
        if(argv.length > 1){
            switch(argv[1]){
                case'irc':
                    server = servers[argv[2]];
                    var c, u, m, s, ii; // eslint-disable-line one-var
                    if(server){
                        if(argv.length > 3){
                            c = server.channel(argv[3]);
                            u = server.user(argv[3]);
                            if(c){
                                stdin.console('log', 'Channel : ' + argv[3]);
                                if(c.topic === null){
                                    stdin.console('log', 'No topic set.');
                                }else{
                                    stdin.console('log', 'Topic: ' + c.topic);
                                }
                                stdin.console('log', 'Users:');
                                for(i = 0; i < c.users.length; i++){
                                    u = c.users[i];
                                    stdin.console('log', '  ' + u.nick + ' (' + u.username + '@' + u.host + ' ' + u.realname + ')');
                                }
                                if(c.modes.b instanceof Array){
                                    stdin.console('log', 'Bans:');
                                    for(i = 0; i < c.modes.b.length; i++){
                                        stdin.console('log', '  ' + c.modes.b[i]);
                                    }
                                }
                                if(c.modes.e instanceof Array){
                                    stdin.console('log', 'Ban Exceptions:');
                                    for(i = 0; i < c.modes.e.length; i++){
                                        stdin.console('log', '  ' + c.modes.e[i]);
                                    }
                                }
                                if(c.modes.I instanceof Array){
                                    stdin.console('log', 'Invitations:');
                                    for(i = 0; i < c.modes.I.length; i++){
                                        stdin.console('log', '  ' + c.modes.I[i]);
                                    }
                                }
                            }else if(u){
                                stdin.console('log', 'Nick: ' + u.nick);
                                stdin.console('log', 'Username: ' + u.username);
                                stdin.console('log', 'Real Name: ' + u.realname);
                                stdin.console('log', 'Host: ' + u.host);
                                stdin.console('log', 'Channels:');
                                for(i = 0; i < u.channels.length; i++){
                                    c = u.channels[i];
                                    stdin.console('log', '  ' + c.name);
                                    m = u.modes[c.name];
                                    if(m !== undefined && m.length > 0){
                                        s = '';
                                        for(ii = 0; ii < m.length; ii++){
                                            s += ',' + m[ii];
                                        }
                                        stdin.console('log', '      Modes: ' + s.substr(1));
                                    }
                                    if(c.topic !== null){
                                        stdin.console('log', '      Topic: ' + c.topic);
                                    }
                                }
                            }else{
                                stdin.console('log', 'Invalid channel');
                            }
                        }else{
                            stdin.console('log', 'Hooks: ' + server.hooks.length);
                            stdin.console('log', 'Channels:');
                            for(i = 0; i < server.channels.length; i++){
                                if(server.channels[i].active){
                                    stdin.console('log', '  ' + server.channels[i].name);
                                }
                            }
                            stdin.console('log', 'Users:');
                            for(i = 0; i < server.users.length; i++){
                                stdin.console('log', '  ' + server.users[i].nick);
                            }
                            stdin.console('log', 'Scripts:');
                            var hooks; // eslint-disable-line one-var
                            for(i = 0; i < server.scripts.length; i++){
                                s = server.scripts[i];
                                hooks = server.scriptHooks(s.sid);
                                stdin.console('log', '  ' + s.sid + ') ' + s.path);
                                stdin.console('log', '      hooks(' + hooks.length + '):');
                                hooks.forEach(function(h, i){
                                    if(h.type === 'event'){
                                        stdin.console('log', '          ' + i + ') ' + h.name);
                                    }else if(h.type === 'regex'){
                                        stdin.console('log', '          ' + i + ') ' + h.regex);
                                    }
                                });
                            }
                        }
                    }else{
                        stdin.console('log', 'Server not found');
                    }
                    break;
                case'ws':
                    server = require('./api.js').websocket.servers[argv[2]];
                    if(server){
                        stdin.console('log', 'Websocket Server ' + server.id);
                        stdin.console('log', '  Port: ' + server.port);
                        stdin.console('log', '  Host: ' + server.host);
                        stdin.console('log', '  IP Version: ' + server.ipv);
                        server.server.getConnections(function(e, count){
                            stdin.console('log', '  Connections: ' + count);
                        });
                    }else{
                        stdin.console('log', 'Server not found');
                    }
                    break;
                case'socket':
                    server = require('./api.js').socket.servers[argv[2]];
                    if(server){
                        stdin.console('log', 'Socket Server ' + server.id);
                        stdin.console('log', '  Port: ' + server.port);
                        stdin.console('log', '  Host: ' + server.host);
                        stdin.console('log', '  IP Version: ' + server.ipv);
                        server.server.getConnections(function(e, count){
                            stdin.console('log', '  Connections: ' + count);
                        });
                    }else{
                        stdin.console('log', 'Server not found');
                    }
                    break;
                case'memory':
                    var mem = mem = process.memoryUsage(); // eslint-disable-line one-var
                    stdin.console('log', 'Memory usage (used/heap/total): ' + tools.sizeString(mem.heapUsed) + '/' + tools.sizeString(mem.heapTotal) + '/' + tools.sizeString(mem.rss));
                    break;
                default:
                    stdin.console('log', 'Invalid info type');
            }
        }else{
            var serv, // eslint-disable-line one-var
                api = require('./api.js'),
                socket = api.socket,
                websocket = api.websocket,
                mem = mem = process.memoryUsage();
            if(servers.length > 0){
                stdin.console('log', 'IRC Servers:');
                for(i = 0; i < servers.length; i++){
                    serv = servers[i].config;
                    stdin.console('log', '  ' + i + ') ' + serv.nick + '@' + serv.host);
                }
            }
            if(socket.servers.length > 0){
                stdin.console('log', 'Socket Servers:');
                for(i = 0; i < socket.servers.length; i++){
                    serv = socket.servers[i];
                    stdin.console('log', '  ' + i + ') ' + serv.host + ':' + serv.port);
                }
            }
            if(websocket.servers.length > 0){
                stdin.console('log', 'Websocket Servers:');
                for(i = 0; i < websocket.servers.length; i++){
                    serv = websocket.servers[i];
                    stdin.console('log', '  ' + i + ') ' + serv.id + ' - ' + serv.host + ':' + serv.port);
                }
            }
            stdin.console('log', 'Memory usage (used/heap/total): ' + tools.sizeString(mem.heapUsed) + '/' + tools.sizeString(mem.heapTotal) + '/' + tools.sizeString(mem.rss));
        }
    },
    '[<type> <id> [<arg>]]\n' +
        '  types:\n' +
        '    irc: information about an irc server\n' +
        '    ws: information about a websocket server\n' +
        '    socket: information about a socket server\n' +
        '    memory: Displays memory usage\n'
    );
for(i = 0; i < mods.length; i++){
    try{
        path = 'mods/' + mods[i] + '/scripts/stdin.js';
        stdin.console('info', ' |- ' + path);
        stdin.scripts[i] = new Script(path, stdin, i);
    }catch(e){
        stdin.console('trace');
        stdin.console('error', e);
    }
}
stdin.console('info', 'Loading db scripts');
mods = tools.mods('db');
for(i = 0; i < mods.length; i++){
    try{
        path = 'mods/' + mods[i] + '/scripts/db.js';
        stdin.console('info', ' |- ' + path);
        stdin.scripts[i] = new Script(path, stdin, i);
    }catch(e){
        stdin.console('trace');
        stdin.console('error', e);
    }
}
stdin.console('info', 'Loading socket scripts');
mods = tools.mods('socket');
for(i = 0; i < mods.length; i++){
    try{
        path = 'mods/' + mods[i] + '/scripts/socket.js';
        stdin.console('info', ' |- ' + path);
        stdin.scripts[i] = new Script(path, stdin, i);
    }catch(e){
        stdin.console('trace');
        stdin.console('error', e);
    }
}
stdin.console('info', 'Loading http scripts');
mods = tools.mods('http');
for(i = 0; i < mods.length; i++){
    try{
        path = 'mods/' + mods[i] + '/scripts/http.js';
        stdin.console('info', ' |- ' + path);
        stdin.scripts[i] = new Script(path, stdin, i);
    }catch(e){
        stdin.console('trace');
        stdin.console('error', e);
    }
}
stdin.console('info', 'Loading websocket scripts');
mods = tools.mods('websocket');
for(i = 0; i < mods.length; i++){
    try{
        path = 'mods/' + mods[i] + '/scripts/websocket.js';
        stdin.console('info', ' |- ' + path);
        stdin.scripts[i] = new Script(path, stdin, i);
    }catch(e){
        stdin.console('trace');
        stdin.console('error', e);
    }
}
