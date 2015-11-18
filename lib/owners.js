var storage = require('node-persist'),
	tools = require('./tools.js'),
	s = require('sanitize-filename');
/**
 * Owners class
 * @module owners
 * @class owners
 * @static
 */
module.exports = (function(){
	var self = {},
		db = storage.create({
			dir: 'owners/'
		});
	db.initSync();
	Object.defineProperty(self,'values',{
		get: function(){
			return db.values();
		}
	});

	self.each = function(callback){
		db.forEach(function(key,value){
			callback.call(value,value,key);
		});
	};
	Object.defineProperty(self,'length',{
		enumerable: true,
		get: function(){
			return db.length();
		}
	});
	self.get = function(nick){
		return db.getItem(s(nick));
	};
	self.add = function(nick,options){
		var owner = db.getItem(s(nick)),
			i;
		if(owner === undefined){
			owner = {
				nick: nick,
				hostmasks: [],
				flags: 'v'
			};
		}
		for(i in options){
			owner[i] = options[i];
		}
		self.update(owner);
		return self;
	};
	self.remove = function(nick){
		db.removeItem(s(nick));
		return self;
	};
	self.update = function(owner){
		db.setItem(s(owner.nick),owner);
	};
	self.addHostMask = function(nick,hostmask){
		if(self.match(hostmask) === undefined){
			var owner = self.get(nick);
			if(owner === undefined){
				self.add(nick);
				owner = self.get(nick);
			}
			owner.hostmasks.push(hostmask);
			self.update(owner);
		}
		return self;
	};
	self.removeHostMask = function(hostmask){
		var owner = self.match(hostmask),
			i;
		if(owner !== undefined){
			for(i=0;i<owner.hostmasks.length;i++){
				if(owner.hostmasks[i] == hostmask){
					owner.hostmasks.splice(i,1);
				}
			}
			self.update(owner);
		}
		return self;
	};
	self.addFlags = function(nick,flags){
		var owner = self.get(nick);
		if(owner){
			flags.split('').forEach(function(f){
				if(owner.flags.indexOf(f)==-1){
					owner.flags += f;
				}
			});
			self.update(owner);
		}
		// TODO - handle flag sync across channels
		return self;
	};
	self.removeFlags = function(nick,flags){
		var owner = self.get(nick);
		if(owner){
			flags.split('').forEach(function(f){
				if(owner.flags.indexOf(f)!=-1){
					owner.flags = owner.flags.replace(f,'');
				}
			});
			self.update(owner);
		}
		// TODO - handle flag sync across channels
		return self;
	};
	self.match = function(hostmask){
		var ret;
		self.each(function(owner){
			var i,h;
			for(i=0;i<owner.hostmasks.length;i++){
				h = owner.hostmasks[i];
				if(h.indexOf('*') != -1){
					var s = tools.wildcardString(h);
					if(hostmask.search(new RegExp(s)) != -1){
						ret = owner;
					}
				}else if(h == hostmask){
					ret = owner;
				}
			}
		});
		return ret;
	};
	return self;
})();