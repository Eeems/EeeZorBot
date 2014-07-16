var User = require('./user.js'),
	debug = require('./debug.js'),
	tools = require('./tools.js');
module.exports = function(server,name){
	var self = this;
	self.name = name;
	self.modes = {};
	self.server = server;
	self.who = function(){
		var i,
			user;
		while(self.users().length > 0){
			user = self.users()[0];
			user.channels.splice(user.channels.indexOf(self));
		}
		self.server.send('WHO '+self.name);
		return self;
	};
	self.users = function(){
		var users = [],
			i,
			user;
		for(i=0;i<server.users.length;i++){
			user = server.users[i];
			if(user.channels.indexOf(self) != -1){
				users.push(user);
			}
		}
		return users;
	};
	self.mode = function(modes,users){
		if(users === undefined){
			self.server.send('mode '+self.name+' '+modes);
		}else{
			var i,
				u;
			users = users instanceof Array?users:[users];
			for(i=0;i<users.length;i++){
				u = users[i];
				if(u instanceof User){
					u = u.nick;
				}
				self.server.send('mode '+self.name+' '+modes+' '+u);
			}
		}
		return self;
	};
	self.topic = function(topic){
		if(topic === undefined){
			self.server.send('TOPIC '+self.name);
		}else{
			self.server.send('TOPIC '+self.name+' '+topic);
		}
		return self;
	};
	self.part = function(){
		self.server.send('part '+self.name);
		return self;
	};
	self.join = function(){
		self.server.send('join '+self.name);
		return self;
	};
	self.server.on(new RegExp(':.+ 352 .+ '+tools.regexString(self.name)+' (.+) (.+) (.+) (.+) .+ :(\\d+) (.+)','i'),function(m){
		var user = server.user([4]);
		if(user){
			if(user.channels.indexOf(self)){
				user.channels.push(self);
			}
		}else{
			user = new User(m[4],m[1],m[2],m[6]);
			user.channels.push(self);
			server.user(user);
		}
	});
	self.who();
	return self;
};