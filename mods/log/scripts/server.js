/*jshint multistr: true */
// Start http server if it isn't running already
var settings = require('../etc/config.json').logs.server,
	id = {
		channel: function(name){
			var sid = id.server(),
				cid = db.querySync("select id from channels where name = ? and s_id = ?",[name,sid])[0];
			return cid===undefined?db.insertSync('channels',{name:name,s_id:sid}):cid.id;
		},
		user: function(nick){
			var uid = db.querySync("select id from users where name = ?",[nick])[0];
			return uid===undefined?db.insertSync('users',{name:nick}):uid.id;
		},
		type: function(name){
			var tid = db.querySync("select id from types where name = ?",[name])[0];
			return tid===undefined?db.insertSync('types',{name:name}):tid.id;
		},
		server: function(){
			var sid = db.querySync("select id from servers where host = ? and port = ?",[server.config.host,server.config.port])[0];
			return sid===undefined?db.insertSync('servers',{name:server.name,host:server.config.host,port:server.config.port}):sid.id;
		}
	},
	log = function(type,channel,user,text){
		db.insert('messages',{
			text: text,
			c_id: id.channel(channel),
			u_id: id.user(user),
			t_id: id.type(type)
		},function(e,id){
			if(e){
				throw e;
			}
			pubsub.pub('log',{
				type: type,
				channel: channel,
				id: id
			});
		});
	},
	hooks = [
		{	// PART
			regex: /^\([#OC]\)([\W0-9])*\* [^ ]+ has left ([^ ]+) \((.*)\)$/i,
			fn: function(m){
				// 1 - colour
				// 2 - nick
				// 3 - reason
				log('part',this.channel.name,m[2],m[1]+m[3]);
			}
		},
		{	// JOIN
			regex: /^\([#OC]\)[\W0-9]*\* ([^ ]+) has joined [^ ]+/i,
			fn: function(m){
				// 1 - nick
				log('join',this.channel.name,m[1],'');
			}
		},
		{	// MODE
			regex: /^\([#OC]\)([\W0-9]*)\* ([^ ]+) set [^ ]+ mode (.+)/i,
			fn: function(m){
				// 1 - colour
				// 2 - nick
				// 3 - mode/args
				log('mode',this.channel.name,m[2],m[1]+m[3]);
			}
		},
		{	// PRIVMSG
			regex: /^[\W0-9]*\([#OC]\)[\W0-9]*<([^>]+)> (.+)$/i,
			fn: function(m){
				// 1 - nick
				// 2 - text
				log('message',this.channel.name,m[1],m[2]);
			}
		},
		{	// ACTION
			regex: /^[\W0-9]*\([#OC]\)[\W0-9]*\* ([^ ]+) (.+)/i,
			fn: function(m){
				// 1 - nick
				// 2 - text
				log('action',this.channel.name,m[1],m[2]);
			}
		}
	],
	sendhooks = [
		{
			// PRIVMSG
			regex: /^PRIVMSG\s(\#?\w+)\s:?([^\x01].+?[^\x01])$/i,
			fn: function(m){
				// 1 - channel
				// 2 - text
				log('message',m[1],server.config.nick,m[2]);
			}
		}
	];
server.on('servername',function(){
		var sid = db.querySync("select id from servers where host = ? and port = ?",[server.config.host,server.config.port])[0];
		if(sid===undefined){
			db.insert('servers',{name:server.name,host:server.config.host,port:server.config.port});
		}else{
			db.update('servers',sid.id,{name:server.name});
		}
	})
	.on('message',function(text){
		var i,m;
		for(i in hooks){
			if((m = hooks[i].regex.exec(text))){
				hooks[i].fn.call(this,m);
				return;
			}
		}
		log('message',this.channel.name,this.user.nick,text);
	})
	.on('join',function(){
		log('join',this.channel.name,this.user.nick,'');
	})
	.on('part',function(){
		log('part',this.channel.name,this.user.nick,'');
	})
	.on('topic',function(old_topic,new_topic){
		log('topic',this.channel.name,this.user.nick,new_topic);
	})
	.on('mode',function(mode,state,value){
		log('mode',this.channel.name,this.user.nick,(state?'+':'-')+mode+' '+value);
	})
	.on('action',function(text){
		log('action',this.channel.name,this.user.nick,text);
	})
	.on('notice',function(text){
		log('notice',this.channel.name,this.user.nick,text);
	})
	.on('datechange',function(){
		var i,
			channels = server.channels,
			c;
		for(i in channels){
			c = channels[i];
			if(c.active){
				log('datechange',c.name,server.name,c.topic);
			}
		}
	})
	.on('quit',function(text,channels){
		var i,p,c;
		for(i in channels){
			c = server.channel(channels[i].name);
			if(c && c.active){
				p = {
					text: text,
					c_id: id.channel(channels[i].name),
					u_id: id.user(this.user.nick),
					t_id: id.type('quit')
				};
				db.insertSync('messages',p);
				pubsub.pub('log',{
					type: 'quit',
					payload: p
				});
				server.debug('Logged quit for '+channels[i].name);
			}
		}
	})
	.on('send',function(text){
		var i,m;
		for(i in sendhooks){
			if((m = sendhooks[i].regex.exec(text))){
				sendhooks[i].fn.call(this,m);
				return;
			}
		}
	});