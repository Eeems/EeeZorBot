var User = require('./user.js'),
	debug = require('./debug.js');
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
		self.server.fire('who',arguments,self);
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
	self.server.on(new RegExp(':.+ 352 .+ '+self.name+' (.+) (.+) (.+) (.+) .+ :(\\d+) (.+)','i'),function(m){
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
		debug.log(
			m[1], // username
			m[2], // host
			m[3], // server
			m[4], // nick
			m[5], // hopcount
			m[6]  // realname
		);
	});
	self.who();
	return self;
};