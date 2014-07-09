var Channel = require('./channel.js'),
	net = require('net'),
	tools = require('./tools.js'),
	log = require('./log.js');
module.exports = function(config){
	var defaults = {
			host: '',
			port: 6667,
			nick: '',
			username: '',
			name: '',
			nickserv: '',
			channels: []
		},
		i,
		ii;
	for(i in defaults){
		if(config[i] === undefined){
			config[i] = defaults[i];
		}
	}
	this.channels = [];
	this.config = {};
	this.buffer = {
		b: new Buffer(4096),
		size: 0
	};
	for(i in config){
		switch(i){
			case 'channels':
				for(ii in config[i]){
					this.channels.push(new Channel(config[i][ii]));
				}
			break;
			default:
				this.config[i] = config[i];
		}
	}
	this.connect = function(){
		if(this.socket === undefined){
			log.log('Connecting to '+this.config.host+':'+this.config.port);
			this.socket = new net.Socket();
			this.socket.setNoDelay(true);
			this.socket.setEncoding('ascii');
			this.socket.on('connect',function(){
				this.parent.log('Connection established (evt)');
				// connection established
			});
			this.socket.on('data',function(d){
				var s = d.split("\r\n"),
					i;
				for(i=0;i<s.length;i++){
					this.parent.logIn(s[i]);
				}
				// TODO - incoming data
			});
			this.socket.on('drain',function(){
				// TODO - No more outgoing data
			});
			this.socket.on('error',function(e){
				this.parent.log('Connection errored');
				this.parent.logError(e);
				this.parent.reconnect();
			});
			this.socket.on('timeout',function(){
				this.parent.log('Connection timed out');
				this.parent.reconnect();
			});
			this.socket.on('end',function(){
				this.parent.log('Connection ended');
				// TODO - server closed connection
			});
			this.socket.on('close',function(e){
				if(e){
					this.parent.log('Connection closed due to an error');
					// TODO - socket was closed due to error
				}else{
					this.parent.log('Connection closed');
					// TODO - socket closure was intended
				}
			});
			this.socket.parent = this;
			this.socket.connect(this.config.port,this.config.host,function(){
				var server = this.parent;
				server.log('Connection established');
				server.send('NICK '+server.config.nick);
				server.send('NAME '+server.config.name);
				// TODO - Handle connection
			});
		}
		return this;
	};
	this.log = function(msg){
		log.alert('['+this.config.host+':'+this.config.port+'] '+msg);
		return this;
	};
	this.logIn = function(msg){
		log.in('['+this.config.host+':'+this.config.port+'] '+msg);
		return this;
	};
	this.logOut = function(msg){
		log.out('['+this.config.host+':'+this.config.port+'] '+msg);
		return this;
	};
	this.logError = function(msg){
		log.error('['+this.config.host+':'+this.config.port+'] '+msg);
		return this;
	};
	this.send = function(d){
		if(d.length > 510){
			// TODO - too large
		}
		try{
			this.logOut(d);
			this.socket.write(d+'\r\n','ascii',function(){
				// TODO - data sent
			});
		}catch(e){
			// TODO - data failed to send
		}
		return this;
	};
	this.join = function(channel){
		this.send('JOIN '+channel);
		return this;
	};
	this.reconnect = function(){
		log.log('Reconnecting');
		this.quit();
		this.connect();
		return this;
	};
	this.quit = function(){
		try{
			this.send('QUIT');
		}catch(e){}
		try{
			this.socket.end();
		}catch(e){}
		try{
			this.socket.destroy();
		}catch(e){}
		return this;
	};
	return this;
};