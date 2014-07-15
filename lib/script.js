var api = require('./api.js'),
	vm = require('vm'),
	fs = require('fs'),
	log = require('./log.js');
module.exports = function(path,server,sid){
	var self = this,
		watcher = {
			close: function(){}
		},i;
	self.api = {};
	for(i in api){
		self.api[i] = api[i];
	}
	self.sid = sid;
	self.server = server;
	self.path = path;
	self.enabled = false;
	self.reload = function(){
		log.log('reloading script');
		try{
			d = fs.readFileSync(path);
			self.api._path = self.path;
			self.api.server = self.server;
			self.api.sid = self.sid;
			self.api.config = self.server.config;
			vm.runInNewContext(d,self.api,self.path);
			self.enabled = true;
		}catch(e){
			log.trace();
			log.error(e);
			self.disable();
		}
	};
	self.disable = function(){
		self.server.run(sid,function(){
			self.server.off();
			self.server.remove();
			self.enabled = false;
		});
		return self;
	};
	self.enable = function(){
		self.disable();
		watcher = fs.watch(self.path,function(e,npath){
			if(e == 'change' && self.enabled){
				self.reload();
			}else if(e == 'rename'){
				self.path = npath;
			}
		});
		self.reload();
		return self;
	};
	self.remove = function(){
		watcher.close();
		self.disable();
		self.server.scripts[sid-1] = null;
		return self;
	};
	self.enable();
	return self;
};