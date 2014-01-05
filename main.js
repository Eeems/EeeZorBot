var config = global.config = require('./config.js'),
	util = require('util'),
	net = require('net'),
	fs = require('fs'),
	vm = require('vm'),
	stdin = global.stdin = process.stdin,
	stdout = process.stdout,
	repl = require('repl'),
	listdb = require('listdb'),
	connections = global.connections = [],
	hooks = global.hooks = [],
	helpdb = global.helpdb = [
		{
			name: 'help',
			help: 'lists all commands, or displays the help on commands',
			script: ''
		},{
			name: 'enable',
			help: 'enables a script',
			script: ''
		},{
			name: 'disable',
			help: 'disables a script',
			script: ''
		},{
			name: 'reload',
			help: 'reloads all the scripts',
			script: ''
		},{
			name: 'scripts',
			help: 'lists all the scripts in the scripts/ folder',
			script: ''
		}
	],
	servers = global.servers = listdb.getDB('servers'),
	scripts = global.scripts = listdb.getDB('scripts'),
	disp = global.disp,
	http = require('http'),
	path = require('path');
fs.mkdirParent = function(dirPath,mode){
	dirPath = path.normalize(dirPath);
	var dirs = dirPath.split(path.sep).reverse(),
		dir = '.';
	(function mkdir(dirs,dir){
		if(dirs.length){
			dir = dir+'/'+dirs.pop();
			try{
				fs.mkdirSync(dir,mode);
			}catch(e){}
			mkdir(dirs,dir);
		}
	})(dirs,dir);
};
// Setup Filesystem
try{
	fs.mkdirSync('scripts');
}catch(e){}
fs.mkdirParent('data/logs');
disp = {
	alert: function(){
		for(var i in arguments){
			switch(typeof arguments[i]){
				case "string": case "number":
					return disp.log("=> "+arguments[i]);
				case "function":
					return disp.log("=> "+arguments[i]());
				default:
					return disp.error("tried to alert an object or array");
			}
		}
	},
	out: function(){
		for(var i in arguments){
			switch(typeof arguments[i]){
				case "string": case "number":
					return disp.log("-> "+arguments[i]);
				case "function":
					return disp.log("-> "+arguments[i]());
				default:
					return disp.error("tried to alert an object or array");
			}
		}
	},
	"in": function(){
		for(var i in arguments){
			switch(typeof arguments[i]){
				case "string": case "number":
					return disp.log("<- "+arguments[i]);
				case "function":
					return disp.log("<- "+arguments[i]());
				default:
					return disp.error("tried to alert an object or array");
			}
		}
	},
	error: function(){
		for(var i in arguments){
			switch(typeof arguments[i]){
				case "function":
					return disp.log("Error: "+arguments[i](),true);
				default:
					return disp.log("Error: "+arguments[i],true);
			}
		}
	},
	save: function(log,msg){
		var d = new Date();
		fs.mkdirParent(path.dirname(log));
		if(typeof msg.toString != 'undefiend'){
			msg = msg.toString();
		}
		switch(config.logtype){
			case 'listdb':
					var l = listdb.getDB('logs/'+log);
					l.add(JSON.stringify({
						date: d.getUTCSeconds(),
						msg: msg
					}));
					break;
			case 'txt': default:
				fs.createWriteStream(log+'.log',{
					flags: 'a'
				}).end("["+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+"]	"+msg+"\r\n");
		}
	},
	log: function(msg,save,error){
		var d = new Date();
		error = (typeof error == 'undefined') ? false : true;
		if(!msg instanceof Array || typeof msg == 'string'){
			msg = [msg];
		}
		for(var i in msg){
			if(!isNaN(parseInt(i))){
				disp.save(d.toDateString(),msg[i]);
				if(error){
					console.error(msg[i]);
				}else{
					console.log(msg[i]);
				}
			}
		}
		return msg;
	},
	trace: function(){
		disp.log((new Error()).stack,true);
	}
};
function exit(){
	for(var i in connections){
		disp.log('Disconnecting from '+connections[i].config.host+':'+connections[i].config.port);
		connections[i].quit();
	}
	unloadScripts();
	disp.log("Exiting.");
	process.exit();
}
function irc(host,port,nick,username,name,nickservP,channels){
	this.buffer = {
		b: new Buffer(4096),
		size: 0
	};
	this.config = {
		host: host,
		port: port || 6667,
		nick: nick,
		username: username,
		name: name
	};
	if(nickservP!=='' && nickservP!==undefined){
		this.config.nickserv = nickservP;
	}
	if(channels!==undefined){
		this.config.channels = channels;
	}
	this.socket = new net.Socket();
	this.socket.setNoDelay(true);
	this.socket.setEncoding('ascii');
	this.socket.parent = this;
	this.quit = function(){
		for(var i in hooks){
			if(hooks[i].type == 'quit'){
				try{
					hooks[i].callback.call(this);
				}catch(e){
					disp.trace();
					disp.error('quit hook failed to fire for '+hooks[i].script);
				}
			}
		}
		try{
			this.send("QUIT");
			this.socket.end();
		}catch(e){
			disp.alert(this.config.host+":"+this.config.port+" already disconnected");
		}
		for(i in connections){
			if(connections[i]==this){
				disp.log('Disconnecting from '+this.config.host+':'+this.config.port);
				connections.splice(i,1);
			}
		}
		for(i in connections){
			if(connections[i] === undefined){
				connections.splice(i,1);
			}
		}
	};
	this.reconnect = function(){
		try{
			this.send("QUIT");
			this.socket.end();
		}catch(e){
			disp.alert(this.config.host+":"+this.config.port+" already disconnected");
		}
		this.socket.connect(this.config.port, this.config.host, function (){
			this.parent.send('NICK ' + sanitize(this.config.nick));
			this.parent.send('USER ' + sanitize(this.config.username) + ' localhost * ' + sanitize(this.config.name));
		});
		if(!inArray(this,connections)){
			connections.push(this);
		}
		for(var i in hooks){
			if(hooks[i].type == 'reconnect'){
				hooks[i].callback.call(this);
			}
		}
	};
	this.send = function(data,hook){
		hook = (typeof hook == 'undefined') ? true : hook;
		if(!data || data.length === 0){
			disp.error("tried to send no data");
			return;
		}else if(data.length > 510){
			disp.error("tried to send data > 510 chars in length: " + data);
			return;
		}
		this.socket.write(data+'\r\n','ascii',function(){
			disp.out(data);
		});
		if(hook){
			for (i = 0; i < hooks.length; i++){
				if(hooks[i].type == 'send'){
					match = hooks[i].options.regex.exec(data);
					if(match){
						try{
							hooks[i].callback.call(this,match,data,this);
						}catch(err){
							disp.trace();
							disp.error("caught error in script "+hooks[i].script+": "+err);
						}
						if(hooks[i].options.once){
							hooks.splice(i, 1);
							i--;
						}
					}
				}
	        }
		}
	};
	this.handle = function(data){
		var dest, i, r, user, replyTo, match;
		if(!inArray(this,global.connections)){
			global.connections.push(this);
		}
		disp.in(data);
		if((/^PING :(.+)/i).exec(data)){
			if((r = (/^PING :(.+)$/i).exec(data)) != null){
				r = r[1];
			}else{
				r = this.config.server;
			}
			this.send("PONG :"+r);
			for (i = 0; i < hooks.length; i++){
				if(hooks[i].type == 'ping'){
					try{
						hooks[i].callback(data,this);
					}catch(err){
						disp.trace();
						disp.error("caught error in script "+hooks[i].script+": "+err);
					}
					if(hooks[i].options.once){
						hooks.splice(i, 1);
						i--;
					}
				}
	        }
		}
		user = (/^:([^!]+)!/i).exec(data);
		if(user){
			user = user[1];
		}
		replyTo = null;
		if(data.indexOf('PRIVMSG') > -1){
			dest = (/^:([^!]+)!.*PRIVMSG ([^ ]+) /i).exec(data);
			if(dest){
				if(dest[2].toUpperCase() == config.nick.toUpperCase()){
					replyTo = dest[1];
				}else{
					replyTo = dest[2];
				}
			}
		}
		if((/^:([^!]+).*:End of \/MOTD command.$/i).exec(data.trim())){
			if(this.config.channels!==undefined){
				for(i in this.config.channels){
					this.send("JOIN "+this.config.channels[i]);
				}
			}
		}else if((new RegExp('^:([^!]+).*'+config.prefix+'help$','i')).exec(data.trim())){
			var r='';
			for(i in helpdb){
				r += helpdb[i].name+", ";
			}
			this.reply(replyTo,r.substr(0,r.length-2));
		}else if((new RegExp('^:([^!]+).*'+config.prefix+'scripts$','i')).exec(data.trim())){
			this.reply(replyTo,"Scripts:");
			var d_scripts = fs.readdirSync('scripts'),enabled;
			if(d_scripts){
				for (i = 0; i < d_scripts.length; i++){
					if(d_scripts[i].substr(-3) == '.js'){
							c = 0;
							h = 0;
							for(j in global.hooks){
								if(global.hooks[j].script == d_scripts[i]){
									c++;
								}
							}
							for(j in global.helpdb){
								if(global.helpdb[j].script == d_scripts[i]){
									h++;
								}
							}
							enabled = inArray(d_scripts[i],global.scripts.getAll());
							this.reply(replyTo,"[\x03"+(enabled?"3E":"4D")+"\x0f] Name: "+d_scripts[i]+' ('+c+':'+h+')');
					}
				}
			}
		}else if((new RegExp('^:([^!]+).*'+config.prefix+'reload$','i')).exec(data.trim())){
			reloadScripts();
			this.reply(replyTo,"Scripts reloaded");
		}else if((new RegExp('^:([^!]+).*'+config.prefix+'enable (.*)$','i')).exec(data.trim())){
			match = (new RegExp('^:([^!]+).*'+config.prefix+'enable (.*)$','i')).exec(data.trim());
			if(loadScript(match[2],true)){
				this.reply(replyTo,"Script "+match[2]+" enabled");
			}else{
				this.reply(replyTo,"Script "+match[2]+" could not be enabled.");
			}
		}else if((new RegExp('^:([^!]+).*'+config.prefix+'disable (.*)$','i')).exec(data.trim())){
			match = (new RegExp('^:([^!]+).*'+config.prefix+'disable (.*)$','i')).exec(data.trim());
			unloadScript(match[2],true);
			this.reply(replyTo,"Script "+match[2]+" disabled");
		}else if((new RegExp('^:([^!]+).*'+config.prefix+'help (.*)$','i')).exec(data)){
			var f = false;
			for(i in helpdb){
				if(helpdb[i].name==(new RegExp('^:([^!]+).*'+config.prefix+'help (.*)$','i')).exec(data)[2]){
					this.reply(replyTo,helpdb[i].name+": "+helpdb[i].help);
					f = true;
				}
			}
			if(!f){
				this.reply(replyTo,"Command not found.");
			}
		}
		for (i = 0; i < hooks.length; i++){
			if(hooks[i].type == 'data'){
				match = hooks[i].options.regex.exec(data);
				if(match){
					try{
						hooks[i].callback(match, data, replyTo,this);
					}catch(err){
						disp.trace();
						disp.error("caught error in script "+hooks[i].script+": "+err);
					}
					if(hooks[i].options.once){
						hooks.splice(i, 1);
						i--;
					}
				}
			}
        }
	};
	this.socket.on('data',function(data){
		var newlineIdx,buff;
		if(this.buffer!==undefined){
			buff = this.buffer;
		}else if(this.parent.buffer!=undefined){
			buff = this.parent.buffer;
		}else{
			disp.error(" Can't handle data from socket. Invalid scope");
			return
		}
		data = data.replace('\r', '');
		while ((newlineIdx = data.indexOf('\n')) > -1){
			if(buff.size > 0){
				data = buff.b.toString('ascii', 0,buff.size) + data;
				newlineIdx += buff.size;
				buff.size = 0;
			}
			this.parent.handle(data.substr(0, newlineIdx));
			data = data.slice(newlineIdx + 1);
		}
		if(data.length > 0){
			buff.b.write(data, buff.size, 'ascii');
			buff.size += data.length;
		}
	});
	this.socket.on('error',function(e){
		disp.error("Connection error: "+e);
		for(var i in hooks){
			if(hooks[i].type == 'error'){
				hooks[i].callback.call(this.parent,e);
			}
		}
		disp.alert('Reconnecting.');
		if(this.parent.config != undefined && this.config.parent.channels != undefined){
			for(var i in this.parent.config.channels){
				this.send('PART '+this.parent.config.channels[i]);
			}
		}
		this.parent.reconnect();
	});
	this.socket.on('timeout',function(){
		disp.error("Connection to "+this.parent.config.host+":"+this.parent.config.port+" timed out.");
		for(var i in hooks){
			if(hooks[i].type == 'timeout'){
				hooks[i].callback.call(this.parent);
			}
		}
		this.parent.reconnect();
	});
	this.socket.on('end',function(){
		disp.error(this.parent.config.host+":"+this.parent.config.port+" closed connection");
		this.parent.quit();
	});
	this.reply = function(replyTo,msg){
		this.send("PRIVMSG "+replyTo+" :"+msg,false);
		for(var i in hooks){
			if(hooks[i].type == 'reply'){
				try{
					hooks[i].callback.call(this,replyTo,msg,this);
				}catch(err){
					disp.trace();
					disp.error("caught error in script "+hooks[i].script+": "+err);
				}
				if(hooks[i].options.once){
					hooks.splice(i, 1);
					i--;
				}
			}
		}
	};
	this.socket.connect(this.config.port, host, function (){
		this.parent.send('NICK ' + sanitize(nick));
		this.parent.send('USER ' + sanitize(username) + ' localhost * ' + sanitize(name));
	});
	for(var i in hooks){
		if(hooks[i].type == 'connect'){
			hooks[i].callback.call(this);
		}
	}
}
function inArray(needle, haystack, returnkey){
	for(var key in haystack){
		if(needle === haystack[key]){
			if(returnkey!==undefined){
				return key;
			}
			return true;
		}
	}
	return false;
}
function sanitize(data){
	if(!data){
		return data;
	}
	/* Note:
	 * 0x00 (null character) is invalid
	 * 0x01 signals a CTCP message, which we shouldn't ever need to do
	 * 0x02 is bold in mIRC (and thus other GUI clients)
	 * 0x03 precedes a color code in mIRC (and thus other GUI clients)
	 * 0x04 thru 0x19 are invalid control codes, except for:
	 * 0x16 is "reverse" (swaps fg and bg colors) in mIRC
	 */
	return data.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[^\x02|\x0b|\x16|\x20-\x7e]/g,"");
}
var loadScripts = global.loadScripts = function(){
	disp.log("Loading Scripts");
	for(var i in connections){
		connections[i].socket.pause();
	}
	var d_scripts = fs.readdirSync('scripts');
	if(d_scripts){
		for (i = 0; i < d_scripts.length; i++){
			if(d_scripts[i].substr(-3) == '.js'){
				if(inArray(d_scripts[i],global.scripts.getAll())){
					loadScript(d_scripts[i]);
				}
			}
		}
		for(i = 0; i < hooks.length; i++){
			if(hooks[i].type == 'load'){
				hooks[i].callback();
			}
		}
	}
	for(i in connections){
		try{
			connections[i].socket.resume();
		}catch(err){}
	}
},
loadScript = global.loadScript = function(scriptName,add){
	disp.log("Loading script "+scriptName+"...");
	var script = fs.readFileSync('scripts/' + scriptName);
	if(script){
		try{
			vm.runInNewContext(script,{
				config: config,
				console: console,
				setTimeout: setTimeout,
				setInterval: setInterval,
				vm: vm,
				fs: fs,
				path: path,
				http: http,
				listdb: listdb,
				stdin: stdin,
				stdout: stdout,
				require: require,
				util: util,
				inputConsole: inputConsole,
				connections: connections,
				exit: exit,
				process: process,
				disp:disp,
				inArray:inArray,
				global:global,
				regHelp: function(name,help){
					helpdb.push({
						name: name,
						help: help,
						script: scriptName
					});
				},
				listen: function(regex,callback,once){
					once = once || false;
					hooks.push({
						type: 'data',
						callback: callback,
						script: scriptName,
						options:{
							once: once,
							regex: regex
						}
					});
				},
				send_listen: function(regex,callback,once){
					once = once || false;
					hooks.push({
						type: 'send',
						callback: callback,
						script: scriptName,
						options:{
							once: once,
							regex: regex
						}
					});
				},
				reply_listen: function(callback,once){
					once = once || false;
					hooks.push({
						type: 'reply',
						callback: callback,
						script: scriptName,
						options: {
							once: once
						}
					});
				},
				hook: function(type,callback,options){
					hooks.push({
						type: type,
						callback: callback,
						script: scriptName,
						options: options
					});
				},
				rCommand: function(name,isArgs){
					if(typeof isArgs!='undefined'){
						return new RegExp('^:([^!]+).*'+config.prefix+name+' (.*)$','i');
					}else{
						return new RegExp('^:([^!]+).*'+config.prefix+name+'$','i');
					}
				},
				regSettings: function(name,settings){
					if(typeof config[name] == "undefined"){
						disp.log('Using Defaults for setting group: '+name);
						config[name] = settings;
					}else{
						for(var i in settings){
							if(typeof config[name][i] == 'undefined'){
								disp.log('Using default for setting: '+name+'['+i+']');
								config[name][i] = settings[i];
							}
						}
					}
					return config[name];
				}
			},scriptName);
			if(add && !inArray(scriptName,global.scripts.getAll())){
				global.scripts.add(scriptName);
			}
			return true;
		}catch(err){
			disp.trace();
			disp.log("Error in script "+scriptName+': '+err,true);
			for (var j = 0; j < hooks.length; j++){
				if(hooks[j].name == scriptName){
					hooks.splice(j, 1);
					j--;
				}
			}
			for (j = 0; j < helpdb.length; j++){
				if(helpdb[j].name == scriptName){
					helpdb.splice(j, 1);
					j--;
				}
			}
			for (j = 0; j < hooks.length; j++){
				if(hooks[j].script == scriptName){
					hooks.splice(j, 1);
					j--;
				}
			}
			return false;
		}
	}else{
		return false;
	}
},
unloadScripts = global.unloadScripts = function(){
	disp.log("Unloading Scripts");
	var d_scripts = fs.readdirSync('scripts');
	if(d_scripts){
		for (i = 0; i < d_scripts.length; i++){
			if(d_scripts[i].substr(-3) == '.js'){
				if(inArray(d_scripts[i],global.scripts.getAll())){
					unloadScript(d_scripts[i]);
				}
			}
		}
	}
},
unloadScript = global.unloadScript = function(scriptName,remove){
	disp.log('Unloading Script: '+scriptName);
	if(remove && inArray(scriptName,global.scripts.getAll())){
		global.scripts.remove(scriptName);
	}
	for (var j = 0; j < hooks.length; j++){
		if(hooks[j].script == scriptName){
			if(hooks[j].type == "unload"){
				hooks[j].callback();
			}
			hooks.splice(j, 1);
			j--;
		}
	}
	for (j = 0; j < helpdb.length; j++){
		if(helpdb[j].script == scriptName){
			helpdb.splice(j, 1);
			j--;
		}
	}
},
reloadScripts = global.reloadScripts = function(){
	disp.log("Reloading Scripts");
	unloadScripts();
	loadScripts();
},
inputConsole = function(data){
	data = data.toString().trim().split(' ');
	var op = data.splice(0,1).toString().toUpperCase(),
		nickS,nickSs,i,c,s,sc,h,j;
	switch(op){
		case 'HOOKS':
			disp.log('Current Hooks:');
			for(i in global.hooks){
				h = global.hooks[i];
				disp.log([
					"Hook: "+i,
					" Type: "+h.type,
					" Script: "+h.script
				]);
			}
		break;
		case 'SCRIPTS':
			disp.log('Installed Scripts:');
			var d_scripts = fs.readdirSync('scripts');
			if(d_scripts){
				for (i = 0; i < d_scripts.length; i++){
					if(d_scripts[i].substr(-3) == '.js'){
							c = 0;
							h = 0;
							for(j in global.hooks){
								if(global.hooks[j].script == d_scripts[i]){
									c++;
								}
							}
							for(j in global.helpdb){
								if(global.helpdb[j].script == d_scripts[i]){
									h++;
								}
							}
							disp.log([
								"Name: "+d_scripts[i],
								" State: "+( inArray(d_scripts[i],global.scripts.getAll()) ? 'ENABLED' : 'DISABLED'),
								" Hooks: "+c,
								" Help Entries: "+h
							]);
					}
				}
			}
		break;
		case 'HELP':
			disp.log([
				"Available Commands:",
				"ADD-CHANNEL, ADD-SERVER, DEBUG, DISABLE, DISABLE-SCRIPT, DISABLE-SCRIPTS, ENABLE, ENABLE-SCRIPT, ENABLE-SCRIPTS, EXIT, HELP, HOOKS, JOIN, LIST, MSG, QUIT, RAW, RELOAD, REMOVE-CHANNEL, REMOVE-SERVER, RUN, SAY, SCRIPTS"
			]);
		break;
		case 'RELOAD':
			reloadScripts();
		break;
		case 'DISABLE':
			unloadScripts();
		break;
		case 'DISABLE-SCRIPT':case 'DISABLE-SCRIPTS':
			if(data.length >= 1){
				for(i in data){
					unloadScript((data[i].substr(-3)=='.js' ? data[i] : data[i]+'.js'),true);
				}
			}else{
				disp.error(" not enough arguements");
			}
		break;
		case 'ENABLE':
			loadScripts();
			break;
		case 'ENABLE-SCRIPT':case 'ENABLE-SCRIPTS':
			if(data.length >= 1){
				for(i in data){
					loadScript((data[i].substr(-3)=='.js' ? data[i] : data[i]+'.js'),true);
				}
			}else{
				disp.error(" not enough arguements");
			}
		break;
		case 'EXIT':
			exit();
			break;
		case 'JOIN':
			if(data.length >= 2){
				if(data[2]!==undefined){
					nickS = data[2];
				}else{
					nickS = "";
				}
				connections.push(new irc(data[0],data[1],config.nick,config.username,config.name,nickS));
			}else{
				disp.error(" not enough arguements");
			}
		break;
		case 'ADD-SERVER':
			if(data.length >= 2){
				if(data[2]!==undefined){
					nickS = data[2];
					nickSs = ",\"nickserv\":\""+nickS+"\"";
				}else{
					nickS;
					nickSs = '';
				}
				connections.push(new irc(data[0],data[1],config.nick,config.username,config.name),nickS);
				servers.add("{\"host\":\""+data[0]+"\",\"port\":\""+data[1]+"\""+nickSs+"}");
			}else{
				disp.error(" not enough arguements");
			}
		break;
		case 'REMOVE-CHANNEL':
			if(data.length == 2){
				if(typeof connections[data[0]] !== 'undefined'){
					if(connections[data[0]].config.channels !== undefined){
						for(i in connections[data[0]].config.channels){
							if(connections[data[0]].config.channels[i]==data[1]){
								connections[data[0]].config.channels.splice(i,1);
							}
						}
					}
				}
				c = connections[data[0]].config;
				s = servers.getAll();
				sc;
				for(i in s){
					sc = JSON.parse(s[i]);
					if(sc.host==c.host && sc.port==c.port && sc.nickserv==c.nickserv){
						servers.remove(s[i]);
						s = {};
						s.host = c.host;
						s.port = c.port;
						if(c.nickserv!==undefined){
							s.nickserv = c.nickserv;
						}
						if(c.channels!==undefined){
							s.channels = c.channels;
						}
						servers.add(JSON.stringify(s));
						break;
					}
				}
				connections[data[0]].send("PART "+data[1]);
			}else{
				disp.error("Not enough arguements");
			}
		break;
		case 'ADD-CHANNEL':
			if(data.length == 2){
				if(connections[data[0]]!==undefined){
					if(connections[data[0]].config.channels === undefined){
						connections[data[0]].config.channels = [];
					}
					connections[data[0]].config.channels.push(data[1]);
					connections[data[0]].send("JOIN "+data[1]);
					c = connections[data[0]].config;
					s = servers.getAll();
					sc;
					for(i in s){
						sc = JSON.parse(s[i]);
						if(sc.host==c.host && sc.port==c.port && sc.nickserv==c.nickserv){
							servers.remove(s[i]);
							s = {};
							s.host = c.host;
							s.port = c.port;
							if(c.nickserv!==undefined){
								s.nickserv = c.nickserv;
							}
							if(c.channels!==undefined){
								s.channels = c.channels;
							}
							servers.add(JSON.stringify(s));
							break;
						}
					}
				}else{
					disp.error("Connection does not exist");
				}
			}else{
				disp.error("Not enough arguements");
			}
		break;
		case 'REMOVE-SERVER':
			if(data.length == 1){
				if(connections[data[0]]!==undefined){
					c = connections[data[0]].config;
					s = servers.getAll();
					sc;
					for(i in s){
						sc = JSON.parse(s[i]);
						if(sc.host==c.host && sc.port==c.port && sc.nickserv==c.nickserv){
							servers.remove(s[i]);
							break;
						}
					}
					connections[data[0]].quit();
				}else{
					disp.error(" connection does not exist");
				}
			}else{
				disp.error(" too many arguements");
			}
		break;
		case 'QUIT':
			if(data.length == 1){
				if(connections[data[0]]!==undefined){
					connections[data[0]].quit();
				}else{
					disp.error(" connection does not exist");
				}
			}else{
				disp.error(" wrong arguement amount");
			}
			break;
		case 'LIST':
			disp.log("Current Connections:");
			for(i in connections){
				if(typeof connections[i] != 'undefined'){
					disp.log(i+" "+connections[i].config.host+":"+connections[i].config.port);
				}
			}
		break;
		case 'DEBUG':
			stdin.removeListener('data',inputConsole);
			repl.start('>').on('exit',function(){
				stdin.on('data',inputConsole);
				disp.log('');
				stdin.resume();
			});
		break;
		case 'RAW':
			if(data.length >= 2){
				connections[data.splice(0,1)].send(data.join(' '));
			}else{
				disp.error(" Not enough perameters");
			}
			break;
		case 'SAY':case 'MSG':
			if(data.length >= 3){
				connections[data.splice(0,1)].reply(data.splice(0,1),data.join(' '));
			}else{
				disp.error(" Not enough perameters");
			}
		break;
		case 'RUN':
			try{
				eval(data.join(' '));
			}catch(e){
				throw(e);
			}
			break;
		default:
			disp.error(" unknown command "+op);
	}
};
stdin.on('data',inputConsole);
stdin.resume();
stdin.setEncoding('utf8');
process.on('uncaughtException', function (err){
	disp.trace();
	disp.error("Script Error: " + err);
});
loadScripts();
var s,n,c,srvs = servers.getAll();
disp.log("Connecting to saved servers");
for(var i in srvs){
	s = JSON.parse(srvs[i]);
	if(s.nickserv!==undefined){
		n = s.nickserv;
	}else{
		n = undefined;
	}
	if(s.channels!==undefined){
		c = s.channels;
	}else{
		c = undefined;
	}
	connections.push(new irc(s.host,s.port,config.nick,config.username,config.name,n,c));
}