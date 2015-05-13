var vm = require('vm'),
	fs = require('fs'),
	log = require('./log.js');
/**
 * Provides a script object that allows a server to handle the loaded script
 * @class Script
 * @module script
 * @param {string} path The path to the script
 * @param {Server} server The server this script is on
 * @param {number} sid The script identifier for this script
 * @constructor
 */
module.exports = function(path,server,sid){
	var self = this,
		watcher = {
			close: function(){}
		},
		api = function(){
			var api =  require('./api.js'),
				_api = {
					script: self,
					require: require,
					process: process,
					console: console,
					_path: self.path,
					server: self.server,
					sid: self.sid,
					config: self.server.config,
				},
				i;
			for(i in api){
				if(_api[i] === undefined){
					_api[i] = api[i];
				}
			}
			return _api;
		};
	/**
	 * stores the script global identifier
	 * @property sid
	 * @type {number}
	 * @static
	 */
	Object.defineProperty(self,'suid',{
		get: function(){
			return self.server.id+'-'+self.sid;
		}
	});
	/**
	 * stores the script identifier
	 * @property sid
	 * @type {number}
	 * @static
	 */
	Object.defineProperty(self,'sid',{
		value: sid,
		enumerable: true
	});
	/**
	 * Stores a reference to the server that this script is used on
	 * @property server
	 * @type {Server}
	 * @static
	 */
	Object.defineProperty(self,'server',{
		value: server,
		enumerable: true
	});
	/**
	 * The path to the script that is run
	 * @property path
	 * @type {string}
	 */
	self.path = path;
	/**
	 * Boolean determining if the script is currently active
	 * @property enabled
	 * @type {Boolean}
	 */
	self.enabled = false;
	/**
	 * reloads the script from the disk
	 * @method reload
	 * @chainable
	 */
	self.load = function(){
		try{
			d = fs.readFileSync(path);
			vm.runInNewContext(d,api(),self.path);
			self.enabled = true;
		}catch(e){
			log.debug('Error in script: '+self.path);
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
			self.server.debug('Force Disabling script '+self.suid);
		}else if(self.enabled){
			self.server.debug('Disabling script '+self.suid);
		}
		self.server.run(self.sid,function(){
			self.unload.call(self);
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
		watcher = fs.watch(self.path,function(e,npath){
			if(e == 'change' && self.enabled){
				self.server.debug('Reloading Script');
				self.server.debug(' |- '+npath);
				self.server.run(self.sid,function(){
					self.disable();
					self.load();
				});
			}else if(e == 'rename'){
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
		self.server.scripts[self.sid-1] = null;
		return self;
	};
	/**
	 * Function to run when the script is unloaded
	 * @property unload
	 * @event
	 * @type {Function}
	 */
	self.unload = function(){};
	self.enable();
	return self;
};