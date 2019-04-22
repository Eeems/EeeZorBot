var Channel = require('./channel.js'),
    User = require('./user.js'),
    owners = require('./owners.js'),
    Script = require('./script.js'),
    net = require('net'),
    tools = require('./tools.js'),
    log = require('./log.js'),
    debug = require('./debug.js');
/**
 * IRC Server object
 * @module server
 * @class server
 * @constructor
 * @param {object} config
 */
module.exports = function(config){
    var self = this,
        date = new Date(+new Date()),
        interval,
        defaults = {
            host: '',
            port: 6667,
            nick: '',
            username: '',
            name: '',
            nickserv: undefined,
            channels: [],
            scripts: [],
            showping: false
        },
        map = [],
        sid = 0,
        i,
        ii;
    for(i in defaults){
        if(config[i] === undefined){
            config[i] = defaults[i];
        }
    }
    /**
     * stores the server identifier
     * @property id
     * @type {number}
     * @static
     */
    Object.defineProperty(self, 'id', {
        get: function(){
            return require('./servers.js').indexOf(self);
        }
    });
    /**
     * Gives the servers name
     * @property name
     * @type {string}
     * @static
     */
    self.name = config.host;
    /**
     * Array of channels on the server
     * @property channels
     * @type {Array}
     */
    self.channels = [];
    /**
     * Array of users on the server that are known
     * @property users
     * @type {Array}
     */
    self.users = [];
    /**
     * Array of all hooks installed on the server
     * @property hooks
     * @type {Array}
     */
    self.hooks = [];
    /**
     * Array of all the scripts installed on the server
     * @property scripts
     * @type {Array}
     */
    self.scripts = [];
    /**
     * Array of all the commands on the server
     * @property commands
     * @type {Object}
     */
    self.commands = {};
    /**
     * Server config
     * @property config
     * @type {Object}
     */
    self.config = {};
    /**
     * Run function in the context of a specific script
     * @method run
     * @param {number} id Script ID to run under (0 == run as server)
     * @param {function} fn function to run
     * @chainable
     */
    self.run = async function(id, fn){
        var osid = sid;
        sid = id;
        await fn.call(self, sid);
        sid = osid;
        return self;
    };
    for(i in config){
        switch(i){
            case'channels':break;
            case'scripts':break;
            default:
                self.config[i] = config[i];
        }
    }
    /**
     * Log something in the context of the server
     * @method log
     * @param {mixed} msg Message to log
     * @chainable
     */
    self.log = function(msg){
        log.alert('[' + self.config.host + ':' + self.config.port + '] ' + msg);
        return self;
    };
    /**
     * Log something in the context of the server
     * @method info
     * @param {mixed} msg Message to log
     * @chainable
     */
    self.info = function(msg){
        log.info('[' + self.config.host + ':' + self.config.port + '] ' + msg);
        return self;
    };
    /**
     * Log something in the context of the server
     * @method debug
     * @param {mixed} msg Message to log
     * @chainable
     */
    self.debug = function(msg){
        debug.log('[' + self.config.host + ':' + self.config.port + '] ' + msg);
        return self;
    };
    /**
     * Log something in the context of the server
     * @method error
     * @param {mixed} msg Message to log
     * @chainable
     */
    self.error = function(msg){
        if(msg instanceof Error){
            log.trace(msg);
        }else{
            log.error(new Error('[' + self.config.host + ':' + self.config.port + '] ' + msg));
        }
        return self;
    };
    /**
     * log.in something in the context of the server
     * @method logIn
     * @param {mixed} msg Message to log
     * @chainable
     */
    self.logIn = function(msg){
        log.in('[' + self.config.host + ':' + self.config.port + '] ' + msg);
        return self;
    };
    /**
     * log.out something in the context of the server
     * @method logOut
     * @param {mixed} msg Message to log
     * @chainable
     */
    self.logOut = function(msg){
        log.out('[' + self.config.host + ':' + self.config.port + '] ' + msg);
        return self;
    };
    /**
     * log.error something in the context of the server
     * @method logError
     * @param {mixed} msg Message to log
     * @chainable
     */
    self.logError = function(msg){
        log.error('[' + self.config.host + ':' + self.config.port + '] ' + msg);
        return self;
    };
    /**
     * Connect to the IRC server
     * @method connect
     * @chainable
     */
    self.connect = function(){
        if(self.socket === undefined){
            log.log('Connecting to ' + self.config.host + ':' + self.config.port);
            self.socket = new net.Socket();
            self.socket.setNoDelay(true);
            // self.socket.setEncoding('binary');
            self.socket.on('connect', function(){
                self.connected = true;
                self.info('Connection established (evt)');
                self.fire('connect', arguments, self);
                self.attempts = 0;
            });
            self.socket.on('data', function(d){
                var buf = tools.convert(d);
                d = buf.toString('UTF-16LE');
                var s = d.split('\r\n'), // eslint-disable-line one-var
                    ii,
                    match,
                    m,
                    o;
                self.fire('data', [d, buf], self);
                for(ii = 0; ii < s.length; ii++){
                    if(s[ii] !== ''){
                        m = /^PING :(.+)/i.exec(s[ii]);
                        if(m){
                            if(self.config.showping){
                                self.logIn(s[ii]);
                            }else{
                                o = log.config.levels.out;
                                log.config.levels.out = false;
                            }
                            self.send('PONG :' + m[1]);
                            if(!self.config.showping){
                                log.config.levels.out = o;
                            }
                            self.fire('ping', arguments, self);
                        }else{
                            self.logIn(s[ii]);
                        }
                        self.hooks.forEach(async function(hook, i){
                            if(hook.type === 'regex'){
                                match = hook.regex.exec(s[ii]);
                                if(match){
                                    await hook.fn.call(self, match, s[ii]);
                                    if(hook.once){
                                        self.hooks.splice(i, 1);
                                    }
                                }
                            }
                        });
                    }
                }
                // TODO - incoming data
            });
            self.socket.on('drain', function(){
                self.debug('Drain event');
                self.fire('drain', arguments, self);
                // TODO - No more outgoing data
            });
            self.socket.on('error', function(e){
                self.info('Connection errored');
                self.connected = false;
                self.fire('error', arguments, self);
                self.error(e);
                setTimeout(function(){
                    self.reconnect();
                }, 1000);
            });
            self.socket.on('timeout', function(){
                self.info('Connection timed out');
                self.connected = false;
                self.fire('timeout', arguments, self);
                setTimeout(function(){
                    self.reconnect();
                }, 1000);
            });
            self.socket.on('end', function(){
                self.info('Connection ended');
                self.connected = false;
                self.fire('end', arguments, self);
                // TODO - server closed connection
                setTimeout(function(){
                    self.reconnect();
                }, 1000);
            });
            self.socket.on('close', function(e){
                self.connected = false;
                if(e){
                    self.info('Connection closed due to an error');
                    setTimeout(function(){
                        self.reconnect();
                    }, 1000);
                }else{
                    self.info('Connection closed');
                    self.fire('close', arguments, self);
                }
            });
            self.socket.connect(self.config.port, self.config.host, function(){
                self.info('Connection established');
                self.send('NICK ' + self.config.nick);
                self.send('USER ' + self.config.name + ' localhost * ' + self.config.name);
            });
        }
        return self;
    };
    /**
     * Send a message to the IRC server
     * @method send
     * @param {string} d Message to send
     * @chainable
     */
    self.send = function(d){
        if(d.length > 510){
            self.fire('error', [new Error('Send String too long')], self);
            return self;
        }
        try{
            if(self.socket){
                self.socket.write(d + '\r\n', 'ascii', function(){
                    self.logOut(d);
                    self.fire('send', [d], self);
                });
            }
        }catch(e){
            self.error(e);
            self.fire('error', [e], self);
        }
        return self;
    };
    /**
     * Install a hook on the server.
     * @method on
     * @param {string|RegExp} hook Hook to install (can be named or RegExp)
     * @param {function} callback Callback to run when the hook fires
     * @param {boolean} [once=false] Should this hook uninstall itself when it is run?
     * @chainable
     */
    self.on = function(hook, callback, once){
        self.debug(' |  |- Hook ' + hook);
        once = once === undefined ? false : once;
        var stack = new Error().stack.split('\n')[2];
        if(hook instanceof RegExp){
            self.hooks.push({
                type: 'regex',
                regex: hook,
                fn: callback,
                once: once,
                sid: sid,
                stack: stack
            });
        }else{
            self.hooks.push({
                type: 'event',
                name: hook,
                fn: callback,
                once: once,
                sid: sid,
                stack: stack
            });
        }
        return self;
    };
    /**
     * Uninstall a hook from the server
     * @method off
     * @param {string|RegExp} hook Hook to remove
     * @param {function} [callback] callback used in the hook you want to remove
     * @chainable
     */
    self.off = function(hook, callback){
        self.debug(' |  |- Number of hooks:' + self.hooks.length);
        self.debug(' |  |- Current sid: ' + sid);
        if(arguments.length === 0){
            self.scriptHooks(sid).forEach(function(h){
                h.type = 'disabled';
            });
        }else{
            self.scriptHooks(sid).forEach(function(h, i){
                if(
                    (
                        (hook === undefined) ||
                        (hook instanceof RegExp && h.type === 'regex' && h.regex === hook) ||
                        (h.type === 'event' && h.name === hook)
                    ) && (
                        callback === undefined ||
                        h.fn === callback
                    )
                ){
                    self.debug(' |  |- Drop Hook ' + h.name);
                    h.type = 'disabled';
                }
            });
        }
        self.debug(' |  |- Number of hooks:' + self.hooks.length);
        return self;
    };
    self.scriptHooks = function(sid){
        sid = sid === undefined ? 0 : sid;
        return self.hooks.filter(function(h){
            return h.type !== 'disabled' && h.sid === sid;
        });
    };
    /**
     * Add a command to the server
     * @method add
     * @param {string} command Command name (used to invoke command)
     * @param {function} callback Callback to run when command invoked
     * @param {string} help Help line for the command
     * @chainable
     */
    self.add = function(command, callback, help){
        if(self.commands[command] === undefined){
            self.debug(' |  |- Command ' + command);
            self.commands[command] = {
                fn: callback,
                sid: sid,
                help: help
            };
        }
        return self;
    };
    /**
     * Remove a command listener from the server
     * @method remove
     * @param {string} command Command you want to remove
     * @chainable
     */
    self.remove = function(command){
        var i,
            n = {};
        if(command === undefined){
            for(i in self.commands){
                if(self.commands[i].sid !== sid){
                    n[i] = self.commands[i];
                }
            }
            self.commands = n;
        }else{
            for(i in self.commands){
                if(i !== command){
                    n[i] = self.commands[i];
                }
            }
            self.commands = n;
        }
        return self;
    };
    /**
     * Fire an event on the IRC server
     * @method fire
     * @param {string} name Name of the event to trigger
     * @param {array} args Arguments to provide the event callbacks
     * @param {mixed} scope What the event callbacks should use for the 'this' keyword
     * @chainable
     */
    self.fire = function(name, args, scope){
        scope = scope === undefined ? self : scope;
        args = args === undefined ? [] : args;
        self.hooks.forEach(function(hook, i){
            if(hook.type === 'event' && hook.name === name){
                try{
                    hook.fn.apply(scope, args);
                }catch(e){
                    self.error(e.message);
                    self.error(hook.stack);
                }
            }
        });
        return self;
    };
    /**
     * Join a channel
     * @method join
     * @param {string} name Channel name
     * @chainable
     */
    self.join = function(name){
        // TODO - handle adding to channel array if it doesn't already exist
        var channel = self.channel(name),
            user = self.user(self.config.nick);
        if(!channel){
            channel = new Channel(self, name);
            self.channels.push(channel);
        }
        channel.join();
        if(!user){
            user = new User(self.config.nick, '', self.config.username, self.config.name, self);
            self.users.push(user);
        }
        user.channels.push(channel);
        user.whois();
        self.fire('join', [], {
            channel: channel,
            user: user,
            owners: owners
        });
        return self;
    };
    /**
     * Leave a channel
     * @method part
     * @param {string} name Name of the channel
     * @chainable
     */
    self.part = function(name){
        var c = self.channel(name);
        if(c){
            c.part();
        }
        return self;
    };
    /**
     * Check if in a channel
     * @method in
     * @param {string} name Name of the channel
     * @return {boolean} status of server in channel
     */
    self.in = function(name){
        // TODO - detect if actually joined to channel and not just created for shits/giggles... I mean for record keeping
        for(var i = 0; i < self.channels.length; i++){
            if(self.channels[i].name === name){
                return true;
            }
        }
        return false;
    };
    /**
     * Get a channel based on it's name
     * @method channel
     * @param {string} name Name of the channel
     * @return {Channel|boolean} Returns false if channel doesn't exist. Returns the channel otherwise
     */
    self.channel = function(name){
        for(var i = 0; i < self.channels.length; i++){
            if(self.channels[i].name === name){
                return self.channels[i];
            }
        }
        return false;
    };
    /**
     * Gets the user or syncs a user on the server
     * @method user
     * @param {string|User} user User object to sync or nick you want the user object for
     * @return {User} The user object
     */
    self.user = function(user){
        var i,
            old;
        if(user instanceof User){
            for(i = 0; i < self.users.length; i++){
                if(self.users[i].nick === user.nick){
                    old = self.users[i];
                }
            }
            if(old !== undefined){
                for(i in user){
                    old[i] = user[i];
                }
            }else{
                old = user;
                self.users.push(user);
            }
        }else{
            for(i = 0; i < self.users.length; i++){
                if(self.users[i].nick === user){
                    old = self.users[i];
                }
            }
            old = old === undefined ? false : old;
        }
        return old;
    };
    /**
     * Gets a script based on the sid
     * @method script
     * @param {number} sid
     * @return {boolean|Script} Returns false if script is not found, otherwise returns the script.
     */
    self.script = function(sid){
        var s = self.scripts[sid - 1];
        return s === undefined || s === null ? false : s;
    };
    /**
     * Reconnects to the IRC server
     * @method reconnect
     * @chainable
     */
    self.reconnect = function(){
        self.attempts++;
        if(self.attempts < 10){
            self.info('Reconnecting (attempt ' + self.attempts + ')');
            self.quit();
            self.connect();
            self.fire('reconnect', arguments, self);
        }else{
            self.info('Too many reconnect attempts');
            self.quit();
            self.fire('stop', arguments, self);
        }
        return self;
    };
    self.attempts = 0;
    self.connected = false;
    /**
     * Quits from the IRC server
     * @method quit
     * @param {string} [msg=string] Quit message. defaults to "Bot shutting down".
     * @chainable
     */
    self.quit = function(msg){
        msg = msg === undefined ? 'Bot shutting down' : msg;
        var user = self.user(self.config.nick),
            channels = self.channels.filter(function(c){
                return c.active;
            });
        self.fire('quit', [msg, channels], {
            user: user
        });
        if(!user){
            user = new User(self.config.nick, '', '', '', self);
        }
        if(self.connected){
            try{
                self.socket.write(msg + '\r\n', 'ascii', function(){
                    self.logOut(msg);
                    self.fire('send', 'QUIT : ' + msg, self);
                });
            }catch(e){}
            try{
                self.socket.end();
            }catch(e){}
        }
        try{
            self.socket.destroy();
        }catch(e){}
        delete self.socket;
        return self;
    };
    self.destroy = function(){
        self.info('Removing Server');
        clearInterval(interval);
        self.quit();
        self.debug('Disabling scripts');
        self.scripts.forEach(function(script){
            script.disable();
        });
        require('./servers.js').splice(self.id, 1);
    };
    process.on('exit', function(){
        self.info('Server handling process exit');
        self.destroy();
    });
    self.debug('Loading server scripts');
    self.debug(' |- lib/server.js');
    self.on('error', function(e){
        self.error(e);
    })
        // RPL_WELCOME
        .on(/:.+ 001 .+ :.+/i, function(){
            var i;
            for(i = 0; i < config.channels.length; i++){
                self.join(config.channels[i]);
            }
            if(self.config.nickserv !== undefined){
                self.send('PRIVMSG NickServ :identify ' + self.config.nickserv.nick + ' ' + self.config.nickserv.password);
            }
            self.send('MODE ' + self.config.nick + ' +B');
        })
        // RPL_MYINFO
        .on(/:.+ 004 .+ (.+) .+ \w+ \w+/i, function(m){
            // 1 - server name
            self.name = m[1];
            self.fire('servername', [], self);
            self.send('MAP');
        })
        // RPL_BOUNCE
        .on(/:.+ 005 :Try server (.+), port (.+)/i, function(m){
            // 1 - server
            // 2 - port
            self.info('Server bounce. Trying ' + m[1] + ':' + m[2]);
            config.host = m[1];
            config.port = m[2];
            self.reconnect();
        })
        //
        .on(/:.+ (?:006|015) .+ :([\s-_`]+)([^\s]+)\s+\((.+)\)/i, function(m){
            // 1 - indentation
            // 2 - server
            // 3 - client count
            map.push({
                prefix: m[1],
                name: m[2],
                clients: m[3],
                line: m[1] + ' ' + m[2] + ' (' + m[3] + ' clients)'
            });
        })
        // RPL_MAPEND
        .on(/:.+ (007|017) .+/i, function(m){
            map.forEach(function(s, i){
                self.info(s.line);
            });
            map = [];
        })
        // RPL_WHOREPLY
        .on(/:.+ 352 .+ (.+) (.+) (.+) (.+) (.+) .+ :(\d+) (.+)/i, function(m){
            // 1 - channel
            // 2 - username
            // 3 - host
            // 4 -
            // 5 - nick
            // 6 -
            // 7 - realname
            var user = self.user(m[5]),
                channel = self.channel(m[1]);
            if(!channel){
                channel = new Channel(self, m[1]);
                self.channels.push(channel);
            }
            if(user){
                if(user.channels.indexOf(channel)){
                    user.channels.push(channel);
                }
            }else{
                user = new User(m[5], m[2], m[3], m[7], self);
                user.channels.push(channel);
                self.user(user);
            }
            user.whois();
        })
        // RPL_WHOISUSER
        .on(/:.+ 311 \S+ (\S+) (\S+) (\S+) \* :(.+)/i, async function(m){
            // 1 - nick
            // 2 - username
            // 3 - host
            // 4 - realname
            var user = self.user(m[1]),
                owner,
                i;
            if(!user){
                user = new User(m[1], m[2], m[3], m[4], self);
                self.users.push(user);
            }else{
                user.username = m[2];
                user.host = m[3];
                user.realname = m[4];
            }
            owner = await owners.match(user.hostmask);
            if(owner !== undefined){
                if(owner.flags.indexOf('v') !== -1){
                    for(i = 0; i < user.channels.length; i++){
                        user.channels[i].mode('+v', user.nick);
                    }
                }
            }
        })
        // RPL_WHOISCHANNELS
        .on(/:.+ 319 .+ (\S+) :(.+)/i, function(m){
            // 1 - Nick
            // 2 - channels
            var user = (function(nick){
                    var u = self.user(nick);
                    if(!u){
                        u = new User(nick, '', '', '', self);
                    }
                    return u;
                })(m[1]),
                channels = m[2].split(' '),
                i,
                ii,
                channel,
                name,
                modes,
                mode;
            user.modes = {};
            for(i = 0; i < channels.length; i++){
                name = channels[i].match(/([+%@&~])?([.~+!#&]?.+)/);
                if(name){
                    modes = name[1] === undefined ? [] : name[1];
                    name = name[2];
                    channel = self.channel(name);
                    if(!channel){
                        channel = new Channel(self, name);
                        self.channels.push(channel);
                    }
                    if(user.channels.indexOf(channel) === -1){
                        user.channels.push(channel);
                    }
                    user.modes[channel.name] = [];
                    for(ii = 0; ii < modes.length; ii++){
                        mode = modes[i];
                        switch(mode){
                            case'+':
                                mode = 'v';
                                break;
                            case'%':
                                mode = 'h';
                                break;
                            case'@':
                                mode = 'o';
                                break;
                            case'&':
                                mode = 'a';
                                break;
                            case'~':
                                mode = 'q';
                                break;
                        }
                        if(mode !== undefined){
                            user.modes[channel.name].push(mode);
                        }
                    }
                }
            }
        })
        // RPL_CHANNELMODEIS
        .on(/:.+ 324 .+ (\S+) \+(.+)/i, function(m){
            // 1 - channel
            // 2 - modes
            var channel = self.channel(m[1]),
                modes = m[2];
            if(!channel){
                channel = new Channel(self, m[1]);
                self.channels.push(channel);
            }
            channel.modes.forEach(function(mode, i){
                if(!(mode instanceof Array)){
                    channel.modes[i] = modes.indexOf(i) !== -1;
                }
            });
            for(i in channel.modes){

            }
        })
        // RPL_BANLIST RPL_EXCEPTLIST RPL_INVITELIST
        .on(/:.+ (367|348|346) \S+ (\S+) (\S+) (\S+) (\d+)/i, function(m){
            // 1 - code
            // 2 - channel
            // 3 - hostmask
            // 4 - user
            // 5 - timestamp
            var channel = self.channel(m[1]),
                mode;
            switch(m[1]){
                case 367:mode = 'b'; break;
                case 348:mode = 'e'; break;
                case 346:mode = 'I'; break;
            }
            if(!channel){
                channel = new Channel(self, m[2]);
                self.channels.push(channel);
            }
            if(!(channel.modes[mode] instanceof Array)){
                channel.modes[mode] = [];
            }
            if(channel.modes[mode].indexOf(m[3]) === -1){
                channel.modes[mode].push(m[3]);
            }
        })
        // RPL_NOTOPIC RPL_TOPIC
        .on(/:.+ (331|332) \S+ (\S+) :(.+)/i, function(m){
            // 1 - code
            // 2 - channel
            // 3 - topic
            var channel = self.channel(m[2]),
                user = self.user(self.name);
            if(!channel){
                channel = new Channel(self, m[2]);
                self.channels.push(channel);
            }
            if(!user){
                user = new User(self.name, '', '', '', self);
            }
            if(m[1] === 331){
                channel._topic = [null];
            }else{
                channel._topic = [m[3]];
            }
            self.fire('topic', ['', m[3]], {
                channel: channel,
                user: user
            });
        })
        // ERR_TOOMANYCHANNELS
        .on(/:.+ 405 (.+) :You have joined too many channels/i, function(m){
            // 1 - channel
            self.channel(m[1]).active = false;
        })
        // ERR_NICKNAMEINUSE ERR_NICKCOLLISION
        .on(/:.+ (433|436) \* (\S+) :(.+)/i, function(m){
            // 1 - code
            // 2 - nick
            // 3 - reason
            var n = parseInt(self.config.nick.substr(-1), 10);
            if(isNaN(n)){
                self.config.nick += '0';
            }else{
                self.config.nick = self.config.nick.substr(0, self.config.nick.length - 1) + (++n);
            }
            self.send('NICK ' + self.config.nick);
            self.info('Unable to set nick to ' + m[2] + ' (' + m[1] + ')' + m[3]);
            self.info('Using nick ' + self.config.nick + ' instead');
        })
        // RPL_ENDOFWHO
        .on(new RegExp(':.+ 315 .+ (\\S+) :End of /WHO list.', 'i'), function(m){
            // 1 - channel
            var c = self.channel(m[1]);
            if(!c){
                c = new Channel(self, m[1]);
                self.channels.push(c);
            }
            self.fire('who', [c], self);
        })
        .on(/:([^ ]+) NICK ([^ ]+)/i, function(m){
            // 1 - Old nick
            // 2 - New Nick
            if(self.config.nick === m[1]){
                self.config.nick = m[2];
            }
            self.fire('nick', m[1], m[2]);
        })
        // PRIVMSG
        .on(/^:([^ ]+)!([^ ]+)@([^ ]+)\sPRIVMSG\s(#?\w+)\s:?([^\x01].+?[^\x01])$/i, function(m){ // eslint-disable-line no-control-regex
            // 1 - nick
            // 2 - username
            // 3 - host
            // 4 - channel
            // 5 - text
            var u = self.user(m[1]),
                ch = m[4] === self.config.nick ? false : self.channel(m[4]);
            if(ch === false){
                ch = new Channel(self, m[4] === self.config.nick ? m[1] : m[4]);
            }
            if(u === false){
                u = new User(m[1], m[2], m[3], '', self);
                u.channels.push(ch);
                self.users.push(u);
            }
            self.fire('message', [m[5]], {
                channel: ch,
                user: u
            });
        })
        // ACTION
        .on(/^:([^ ]+)!([^ ]+)@([^ ]+)\sPRIVMSG\s(#?\w+)\s:?\x01ACTION (.+)?\x01$/i, function(m){ // eslint-disable-line no-control-regex
            // 1 - nick
            // 2 - username
            // 3 - host
            // 4 - channel
            // 5 - text
            var u = self.user(m[1]),
                ch = m[4] === self.config.nick ? false : self.channel(m[4]);
            if(ch === false){
                ch = new Channel(self, m[4] === self.config.nick ? m[1] : m[4]);
            }
            if(u === false){
                u = new User(m[1], m[2], m[3], '', self);
                u.channels.push(ch);
                self.users.push(u);
            }
            self.fire('action', [m[5]], {
                channel: ch,
                user: u
            });
        })
        // NOTICE
        .on(/^:([^ ]+)!([^ ]+)@([^ ]+)\sNOTICE\s(#?\w+)\s:?(.+)$/i, function(m){
            // 1 - nick
            // 2 - username
            // 3 - host
            // 4 - channel
            // 5 - text
            var u = self.user(m[1]),
                ch = m[4] === self.config.nick ? false : self.channel(m[4]);
            if(ch === false){
                ch = new Channel(self, m[4] === self.config.nick ? m[1] : m[4]);
            }
            if(u === false){
                u = new User(m[1], m[2], m[3], '', self);
                u.channels.push(ch);
                self.users.push(u);
            }
            self.fire('notice', [m[5]], {
                channel: ch,
                user: u
            });
        })
        // Command
        .on(new RegExp('^:([^ ]+)!([^ ]+)@([^ ]+)\\sPRIVMSG\\s(\\#?\\w+)\\s:?' + tools.regexString(self.config.prefix) + '(\\S+)\\s?(.+)?$', 'i'), function(m){
            // 1 - nick
            // 2 - username
            // 3 - host
            // 4 - channel
            // 5 - command
            // 6 - arguments
            var c = self.commands[m[5]],
                a = m[6],
                u = self.user(m[1]),
                ch = m[4] === self.config.nick ? false : self.channel(m[4]);
            a = a === undefined ? [] : a.split(' ');
            if(ch === false){
                ch = new Channel(self, m[4] === self.config.nick ? m[1] : m[4]);
            }
            if(u === false){
                u = new User(m[1], m[2], m[3], '', self);
                u.channels.push(ch);
                self.users.push(u);
            }
            if(c !== undefined){
                c.fn.apply({
                    server: self,
                    argv: a,
                    channel: ch,
                    user: u
                }, a);
            }
        })
        // TOPIC
        .on(/:(\S+)!(.+)@(.+) TOPIC (\S+) :(.+)/i, function(m){
            // 1 - nick
            // 2 - username
            // 3 - host
            // 4 - channel
            // 5 - topic
            var channel = self.channel(m[4]),
                user = self.user(m[1]);
            if(!channel){
                channel = new Channel(self, m[4]);
                self.channels.push(channel);
            }
            if(!user){
                user = new User(m[1], m[2], m[3], '', self);
            }
            self.fire('topic', [channel.topic, m[5]], {
                channel: channel,
                user: user
            });
            channel._topic = [m[5]];
        })
        // JOIN
        .on(new RegExp(':(\\S+)\\!(.+)@(.+) JOIN :(\\S+)', 'i'), async function(m){
            // 1 - nick
            // 2 - username
            // 3 - host
            // 4 - channel
            var channel = (function(){
                    var c = self.channel(m[4]);
                    if(!c){
                        c = new Channel(self, m[4]);
                        self.channels.push(c);
                    }
                    return c;
                })(),
                user;
            if(m[1] === self.config.nick){
                channel.who(); // get users
                self.send('MODE ' + channel.name); // get modes
                self.send('MODE ' + channel.name + ' b'); // get bans
                self.send('MODE ' + channel.name + ' e'); // get exceptions
                self.send('MODE ' + channel.name + ' I'); // get invitation masks
            }else{
                user = self.user(m[1]);
                if(!user){
                    user = new User(m[1], m[2], m[3], '', self);
                    self.users.push(user);
                }
                user.channels.push(channel);
                user.whois();
                var f = async function(flag, mode){ // eslint-disable-line one-var
                    var owner = await user.owner();
                    if(owner && owner.flags && owner.flags.indexOf(flag) !== -1){
                        self.info('Setting mode ' + flag + ' on owner ' + owner.nick);
                        channel.mode(mode, user);
                    }
                };
                await f('v', '+v');
                await f('h', '+h');
                await f('o', '+o');
                await f('a', '+a');
                await f('q', '+q');
                if(await user.banned()){
                    self.info('Kicking ' + user.nick + ' from ' + channel.name);
                    channel.mode('+b', user);
                    channel.kick(user);
                }
                self.fire('join', [], {
                    channel: channel,
                    user: user,
                    owners: owners
                });
            }
        })
        // PART
        .on(new RegExp(':(\\S+)\\!(.+)@(.+) PART (\\S+)', 'i'), function(m){
            // 1 - nick
            // 2 - username
            // 3 - host
            // 4 - channel
            var channel = (function(){
                    var c = self.channel(m[4]);
                    if(!c){
                        c = new Channel(self, m[4]);
                        self.channels.push(c);
                    }
                    return c;
                })(),
                user = self.user(m[1]);
            if(user && user.channels.indexOf(channel) !== -1){
                user.channels.splice(user.channels.indexOf(channel), 1);
                self.fire('part', [], {
                    channel: channel,
                    user: user,
                    owners: owners
                });
            }
        })
        // QUIT
        .on(new RegExp(':(\\S+)\\!(.+)@(.+) QUIT :?(.+)', 'i'), function(m){
            // 1 - nick
            // 2 - username
            // 3 - host
            // 4 - message
            var user = self.user(m[1]),
                chans;
            if(user){
                chans = user.channels.slice(0);
                self.fire('quit', [m[4], chans], {
                    user: user
                });
            }
        })
        // MODE
        .on(/:([^ ]+)!([^ ]+)@([^ ]+) MODE (\S+) (\S+) ?(.+)?/i, function(m){
            // 1 - nick (doing the action)
            // 2 - username
            // 3 - host
            // 4 - channel
            // 5 - modes
            // 6 - nick (recieving the action)
            var guser = function(nick){
                    var user = self.user(nick); // m[6]
                    if(!user){
                        user = new User(nick === undefined ? m[1] : nick, '', '', '', self);
                        self.users.push(user);
                    }
                    if(user.channels.indexOf(channel) === -1){
                        user.channels.push(channel);
                    }
                    if(user.modes[channel.name] === undefined){
                        user.modes[channel.name] = [];
                    }
                    return user;
                },
                channel = self.channel(m[4]),
                target,
                value,
                i,
                ii = 0,
                user,
                state = m[5][0] === '+',
                mode,
                index,
                argv = m[6] === undefined ? [] : m[6].split(' ');
            if(!channel){
                channel = new Channel(self, m[4]);
            }
            for(i = 1; i < m[5].length; i++){
                mode = m[5][i];
                if('+-'.indexOf(mode) !== -1){
                    state = mode === '+';
                }else{
                    if('vhoaq'.indexOf(mode) !== -1 && argv[ii] !== undefined){
                        user = guser(argv[ii]);
                        if(state){
                            if(user.modes[channel.name].indexOf(mode) === -1){
                                user.modes[channel.name].push(mode);
                            }
                        }else{
                            index = user.modes[channel.name].indexOf(mode);
                            if(index !== -1){
                                user.modes[channel.name].splice(index, 1);
                            }
                        }
                        target = user;
                        value = user.nick;
                    }else if('bdefIJklLR'.indexOf() && argv[ii] !== undefined){
                        if(state){
                            if(!(channel.modes[mode] instanceof Array)){
                                channel.modes[mode] = [];
                            }
                            channel.modes[mode].push(argv[ii]);
                            target = channel;
                            value = argv[ii];
                        }else{
                            if(channel.modes[mode] instanceof Array){
                                index = channel.modes[mode].indexOf(argv[ii]);
                                if(index !== -1){
                                    channel.modes[mode].splice(index, 1);
                                }
                                if(channel.modes[mode].length === 0){
                                    channel.modes[mode] = false;
                                }
                            }else{
                                channel.modes[mode] = false;
                            }
                            target = channel;
                            value = argv[ii] === undefined ? '' : argv[ii];
                        }
                    }else{
                        channel.modes[mode] = state;
                        value = '';
                        target = channel;
                    }
                    self.fire('mode', [mode, state, value], {
                        user: guser(m[1]),
                        channel: channel,
                        target: target
                    });
                    ii++;
                }
            }
        })
        .add('help', function(){
            var i, s, t = this;
            if(t.argv.length === 0){
                s = 'Available commands: ';
                for(i in self.commands){
                    s += i + ', ';
                }
                s = s.substr(0, s.length - 2);
                self.send('PRIVMSG ' + t.channel.name + ' :' + s);
            }else{
                t.argv.forEach(function(a){
                    if(self.commands[a] === undefined){
                        self.send('PRIVMSG ' + t.channel.name + ' :' + a + ': undefined');
                    }else{
                        self.send('PRIVMSG ' + t.channel.name + ' :' + a + ': ' + self.commands[a].help);
                    }
                });
            }
        }, 'Provides information on available commands');
    var api = require('./api.js'), // eslint-disable-line one-var
        fn = function(i){
            self.scripts[ii] = new Script('mods/' + mods[ii] + '/scripts/server.js', self, i);
        },
        mods = api.mods('server');
    api.servers.push(self);
    (async function(){
        for(ii = 0; ii < mods.length; ii++){
            self.debug(' |- ' + mods[ii]);
            await self.run(ii + 1, fn);
        }
    })();
    interval = setInterval(function(){
        if(self.socket !== undefined){
            var d = new Date(+new Date());
            if(d.getDate() !== date.getDate()){
                date = d;
                self.fire('datechange', [], {});
            }
        }
    }, 1000);
    return self;
};
