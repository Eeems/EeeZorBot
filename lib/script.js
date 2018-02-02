const vm2 = require('vm2'),
    NodeVM = vm2.NodeVM,
    fs = require('fs'),
    log = require('./log.js'),
    path = require('path');
/**
 * Provides a script object that allows a server to handle the loaded script
 * @class Script
 * @module script
 * @param {string} path The path to the script
 * @param {Server} server The server this script is on
 * @param {number} sid The script identifier for this script
 * @constructor
 */
module.exports = function(scriptpath, server, sid){
    var self = this,
        watcher = {
            close: function(){}
        },
        api = function(){
            var api = require('./api.js'),
                _api = {
                    script: self,
                    process: process,
                    _path: self.path,
                    _dirname: path.dirname(self.path),
                    _root: path.dirname(__dirname),
                    server: self.server,
                    sid: self.sid,
                    config: self.server.config,
                    log: log,
                    db: api.db,
                    websocket: require('./websocket.js')
                },
                i;
            for(i in api){
                if(_api[i] === undefined){
                    _api[i] = api[i];
                }
            }
            if(!_api.stdin || Object.keys(_api.stdin).length === 0){
                _api.stdin = self.server;
            }
            _api.api = _api;
            return _api;
        };
    /**
     * stores the script global identifier
     * @property sid
     * @type {number}
     * @static
     */
    Object.defineProperty(self, 'suid', {
        get: function(){
            return self.server.id + '-' + self.sid;
        }
    });
    /**
     * stores the script identifier
     * @property sid
     * @type {number}
     * @static
     */
    Object.defineProperty(self, 'sid', {
        value: sid,
        enumerable: true
    });
    /**
     * Stores a reference to the server that this script is used on
     * @property server
     * @type {Server}
     * @static
     */
    Object.defineProperty(self, 'server', {
        value: server,
        enumerable: true
    });
    /**
     * The path to the script that is run
     * @property path
     * @type {string}
     */
    self.path = scriptpath;
    /**
     * Boolean determining if the script is currently active
     * @property enabled
     * @type {Boolean}
     */
    self.enabled = false;
    self.dirty = false;
    /**
     * reloads the script from the disk
     * @method reload
     * @chainable
     */
    self.load = function(){
        try{
            self.server.run(self.sid, function(){
                NodeVM.file(self.path, {
                    console: 'inherit',
                    sandbox: api(),
                    compiler: 'javascript',
                    require: {
                        external: true,
                        builtin: ['*'],
                        root: '.',
                        context: 'host',
                        import: [
                            'deasync',
                            'msgpack-lite',
                            'vm2',
                            'mysql',
                            'ws',
                            'iconv',
                            'chardet',
                            'sanitize-filename',
                            'node-persist'
                        ],
                        mock: {
                            api: require('./api.js'),
                            servers: require('./servers.js')
                        }
                    }
                });
                self.enabled = true;
                self.dirty = false;
            });
        }catch(e){
            log.debug('Error in script: ' + self.path);
            log.trace(e);
            self.disable(true);
        }
    };
    /**
     * Disables the script (hooks, commands etc)
     * @method disable
     * @chainable
     */
    self.disable = function(force){
        if(force){
            self.server.debug('Force Disabling script ' + self.suid);
        }else if(self.enabled){
            self.server.debug('Disabling script ' + self.suid);
        }
        self.server.run(self.sid, function(){
            self.unload();
            self.server.off();
            self.server.remove();
            self.enabled = false;
        });
        return self;
    };
    /**
     * Description
     * @method enable
     * @chainable
     */
    self.enable = function(){
        self.disable();
        watcher = fs.watch(self.path, function(e, npath){
            if(e === 'change' && self.enabled && !self.dirty){
                self.server.debug('Reloading Script');
                self.server.debug(' |- ' + npath);
                self.dirty = true;
                self.server.run(self.sid, function(){
                    self.disable();
                    process.nextTick(function(){
                        self.load();
                    });
                });
            }else if(e === 'rename'){
                self.path = npath;
            }
        });
        self.load();
        return self;
    };
    /**
     * Disables and removes the script from the server.
     * @method remove
     * @chainable
     */
    self.remove = function(){
        watcher.close();
        self.disable();
        self.server.scripts[self.sid - 1] = null;
        return self;
    };
    /**
     * Function to run when the script is unloaded
     * @property unload
     * @event unload
     * @type {Function}
     */
    self.unload = function(){};
    self.enable();
    return self;
};
