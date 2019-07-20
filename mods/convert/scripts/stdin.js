/* global db stdin log tools script */
var fs = require('fs'),
    path = require('path'),
    deasync = require('deasync'),
    getFolderSize = deasync(require('get-folder-size')),
    converting = false,
    passed = 0,
    failed = 0,
    status = {
        servers: [0, 0],
        channels: [0, 0],
        files: [0, 0],
        lines: [0, 0]
    },
    id = {
        channel: function(name, server){
            var sid = id.server(server),
                cid = db.querySync('select id from channels where name = ? and s_id = ?', [name, sid])[0];
            return cid === undefined ? db.insertSync('channels', {name: name, s_id: sid}) : cid.id;
        },
        user: function(nick){
            var uid = db.querySync('select id from users where name = ?', [nick])[0];
            return uid === undefined ? db.insertSync('users', {name: nick}) : uid.id;
        },
        type: function(name){
            var tid = db.querySync('select id from types where name = ?', [name])[0];
            return tid === undefined ? db.insertSync('types', {name: name}) : tid.id;
        },
        server: function(server){
            var sid = db.querySync('select id from servers where host = ? and port = ?', [server.name, server.port])[0];
            return sid === undefined ? db.insertSync('servers', {name: server.name, host: server.name, port: server.port}) : sid.id;
        }
    },
    dispStatus = () => {
        stdin.console('log', 'Servers: ' + status.servers[0] + '/' + status.servers[1]);
        stdin.console('log', 'Channels: ' + status.channels[0] + '/' + status.channels[1]);
        stdin.console('log', 'Files: ' + status.files[0] + '/' + status.files[1]);
        stdin.console('log', 'Lines: P:' + passed + ' F:' + failed + ' ' + status.lines[0] + '/' + status.lines[1]);
    },
    getServers = function(callback){ // eslint-disable-line camelcase
        var ret = [];
        fs.readdir('data/logs/', function(e, l_servers){ // eslint-disable-line camelcase
            if(e){
                throw e;
            }
            l_servers.forEach(function(l_server){ // eslint-disable-line camelcase
                if(l_server.search(/^[\w\.]+ \d{4}$/) !== -1){ // eslint-disable-line no-useless-escape
                    var stats = fs.statSync('data/logs/' + l_server); // eslint-disable-line camelcase, one-var
                    if(stats.isDirectory()){
                        var l_channels = fs.readdirSync('data/logs/' + l_server), // eslint-disable-line camelcase, one-var
                            channels = [],
                            server = {
                                name: l_server.split(' ')[0],
                                port: l_server.split(' ')[1],
                                path: 'data/logs/' + l_server + '/', // eslint-disable-line camelcase
                                channels: channels,
                                type: 'server'
                            };
                        l_channels.forEach(function(l_channel){ // eslint-disable-line camelcase
                            if(l_channel.search(/^#[^ #]+$/) !== -1){
                                var path = 'data/logs/' + l_server + '/' + l_channel + '/'; // eslint-disable-line camelcase
                                channels.push({
                                    name: l_channel,
                                    path: path,
                                    type: 'channel',
                                    size: tools.sizeString(getFolderSize(path)),
                                    server: server
                                });
                            }
                        });
                        ret.push(server);
                    }
                }
            });
            callback(ret);
        });
    },
    hooks = [
        { // MODE
            regex: /^([\w.]+) set #\w+ mode (.+)$/,
            fn: function(m, d){
                // 1 - user
                // 2 - flags
                d.user = m[1];
                d.msg = m[2];
                d.type = 'mode';
            }
        },
        { // QUIT
            regex: /^([\w.]+) has quit #\w+ \((.+)\)$/,
            fn: function(m, d){
                // 1 - user
                // 2 - reason
                d.type = 'quit';
                d.user = m[1];
                d.msg = m[2];
            }
        }, {
            regex: /([^ ]+) (.+)/,
            fn: function(m, d){
                // 1 - nick
                // 2 - msg
                d.type = 'action';
                d.user = m[1];
                d.msg = m[2];
            }
        }
    ],
    convert = async function(obj){
        if(obj && obj.name && obj.type && obj.path){
            console.time(path.basename(obj.name));
            stdin.console('log', 'Converting ' + obj.name);
            switch(obj.type){
                case'server':
                    status.channels[1] = obj.channels.length;
                    obj.channels.forEach(async (channel, i) => {
                        status.channels[0] = i;
                        await convert(channel);
                    });
                    break;
                case'channel':
                    var files = fs.readdirSync(obj.path);
                    passed = 0;
                    failed = 0;
                    status.files[1] = files.length;
                    files.forEach(function(l_log, i){ // eslint-disable-line camelcase
                        if(path.extname(l_log) === '.db'){
                            status.files[0] = i;
                            var lines = fs.readFileSync(obj.path + l_log, { // eslint-disable-line camelcase
                                encoding: 'ascii'
                            }).split('\n');
                            status.lines = [0, lines.length];
                            lines.forEach(async (d) => {
                                try{
                                    d = JSON.parse(d.replace(/\n$/, ''));
                                    if(!d.user){
                                        d.user = 'server';
                                        var i, match;
                                        for(i in hooks){
                                            match = hooks[i].regex.exec(d.msg);
                                            if(match){
                                                hooks[i].fn(match, d);
                                                break;
                                            }
                                        }
                                    }else if(d.user.indexOf('> ') !== -1){
                                        d.msg = d.user.substr(d.user.indexOf('> ') + 2) + d.msg;
                                        d.user = d.user.substr(0, d.user.indexOf('> '));
                                    }
                                    if(d.type){
                                        d.c_id = id.channel(obj.name, obj.server);
                                        d.u_id = id.user(d.user);
                                        d.t_id = id.type(d.type);
                                        d.date = 'STR_TO_DATE(' + db.escape((new Date(d.date)).toISOString()) + ",'%Y-%m-%dT%T.%fZ')";
                                        var sql = 'INSERT INTO messages (text, c_id, u_id, t_id, date) ' + // eslint-disable-line one-var
                                            'SELECT ?,?,?,?,' + d.date + ' FROM DUAL ' +
                                            'WHERE NOT EXISTS (' +
                                                'SELECT 1 ' +
                                                'FROM messages ' +
                                                'WHERE date = ' + d.date + ' ' +
                                                'AND c_id = ? ' +
                                                'AND u_id = ? ' +
                                                'AND t_id = ? ' +
                                                'AND text = ? ' +
                                            ');',
                                            args = [
                                                d.msg, d.c_id, d.u_id, d.t_id,
                                                d.c_id, d.u_id, d.t_id, d.msg
                                            ];
                                        await new Promise((resolve) => {
                                            db.query(sql, args, function(e, r){
                                                if(e){
                                                    failed++;
                                                    log.save('convert', JSON.stringify(e) + ' ' + JSON.stringify(d));
                                                    status.lines[0]++;
                                                }else{
                                                    passed++;
                                                    status.lines[0]++;
                                                }
                                                resolve();
                                            });
                                        });
                                    }else{
                                        failed++;
                                        log.save('convert', 'No type specified ' + JSON.stringify(d));
                                        status.lines[0]++;
                                    }
                                }catch(e){
                                    failed++;
                                    log.save('convert', JSON.stringify(e) + ' ' + JSON.stringify(d));
                                    status.lines[0]++;
                                }
                            });
                        }
                    });
                    stdin.console('log', obj.name + ' conversion. ' + passed + ' passed, ' + failed + ' failed.');
                    passed = 0;
                    failed = 0;
                    break;
            }
            console.timeEnd(path.basename(obj.name));
        }else{
            stdin.console('error', 'Unable to convert: ' + JSON.stringify(obj));
        }
    };
stdin.add('convert', function(argv){
    getServers(function(l_servers){ // eslint-disable-line camelcase
        var actions = {
            help: function(){
                stdin.console('log', 'Available actions:');
                stdin.console('log', Object.keys(actions).join(', '));
            },
            ls: function(argv){
                var a = [],
                    l_server, l_channel; // eslint-disable-line camelcase
                if(argv.length === 0){
                    if(l_servers.length){
                        l_servers.forEach(function(l_server){ // eslint-disable-line camelcase
                            a.push(l_server.name);
                        });
                    }else{
                        stdin.console('log', 'No server logs found');
                    }
                }else if(argv.length > 0){
                    if(!~~l_servers.indexOf(argv[0])){
                        stdin.console('log', `Server ${argv[0]} not found`);
                    }else{
                        l_server = l_servers[argv[0]]; // eslint-disable-line camelcase
                        if(argv.length === 1){
                            l_server.channels.forEach(function(l_channel){ // eslint-disable-line camelcase
                                a.push(l_channel.name);
                            });
                        }else if(!~~l_server.channels.indexOf(argv[1])){
                            stdin.console('log', `Channel ${argv[1]} not found`);
                        }else{
                            l_channel = l_server.channels[argv[1]]; // eslint-disable-line camelcase
                            stdin.console('log', `Logs size: ${l_channel.size}`);
                        }
                    }
                }
                a.forEach(function(v, i){
                    stdin.console('log', i + ') ' + v);
                });
            },
            do: async function(argv){
                if(converting){
                    stdin.console('log', 'Conversion already in progress');
                }else{
                    converting = true;
                    if(argv.length === 0){
                        status.servers[1] = l_servers.length;
                        l_servers.forEach(async (l_server, i) => { // eslint-disable-line camelcase
                            status.servers[0] = i;
                            await convert(l_server);
                        });
                        status.servers[0] = status.servers[1];
                    }else if(argv.length === 1){
                        status.servers = [0, 1];
                        await convert(l_servers[argv[0]]);
                        status.servers = [1, 1];
                    }else if(argv.length === 2){
                        status.servers = [0, 0];
                        status.channels = [0, 1];
                        await convert(l_servers[argv[0]].channels[argv[1]]);
                        status.channels[0] = 1;
                    }else{
                        stdin.console('log', 'Invalid argument length');
                    }
                    converting = false;
                }
            },
            status: dispStatus,
            debug: function(argv){
                stdin.stop();
                stdin.console('log', 'Starting conversion debugger');
                var repl = require('repl').start({
                        terminal: true,
                        useColor: true,
                        useGlobal: false
                    }),
                    context = repl.context;
                context.convert = convert;
                context.getServers = getServers;
                context.id = id;
                context.converting = converting;
                context.hooks = hooks;
                repl.on('exit', function(){
                    stdin.console('log', 'Debugger exiting');
                    stdin.start();
                });
            }
        };
        if(argv.length > 1){
            if(actions[argv[1]]){
                actions[argv[1]].call(this, argv.splice(2));
            }else{
                stdin.console('log', 'Unknown convert action: ' + argv[1]);
            }
        }else{
            actions.help();
        }
    });
}, 'Perform log conversion actions');
script.unload = () => {
    if(converting){
        stdin.console('log', 'Conversion continuing in the background. You will no longer be able to get the status.');
    }
    stdin.remove('convert');
};
