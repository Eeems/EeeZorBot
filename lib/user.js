module.exports = function(nick,username,host,realname){
	this.nick = nick;
	this.username = username;
	this.host = host;
	this.realname = realname;
	this.channels = [];
	return this;
};