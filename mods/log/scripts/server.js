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
	hooks = [
		{	// PART
			regex: /^\([#OC]\)([\W0-9])*\* [^ ]+ has left ([^ ]+) \((.*)\)$/i,
			fn: function(m){
				// 1 - colour
				// 2 - nick
				// 3 - reason
				db.insert('messages',{
					text: m[1]+m[3],
					c_id: id.channel(this.channel.name),
					u_id: id.user(m[2]),
					t_id: id.type('part')
				});
			}
		},
		{	// JOIN
			regex: /^\([#OC]\)[\W0-9]*\* ([^ ]+) has joined [^ ]+/i,
			fn: function(m){
				// 1 - nick
				db.insert('messages',{
					text: '',
					c_id: id.channel(this.channel.name),
					u_id: id.user(m[1]),
					t_id: id.type('join')
				});
			}
		},
		{	// MODE
			regex: /^\([#OC]\)([\W0-9]*)\* ([^ ]+) set [^ ]+ mode (.+)/i,
			fn: function(m){
				// 1 - colour
				// 2 - nick
				// 3 - mode/args
				db.insert('messages',{
					text: m[1]+m[3],
					c_id: id.channel(this.channel.name),
					u_id: id.user(m[2]),
					t_id: id.type('mode')
				});
			}
		},
		{	// PRIVMSG
			regex: /^[\W0-9]*\([#OC]\)[\W0-9]*<([^ ]+)> (.+)$/i,
			fn: function(m){
				// 1 - nick
				// 2 - text
				db.insert('messages',{
					text: m[2],
					c_id: id.channel(this.channel.name),
					u_id: id.user(m[1]),
					t_id: id.type('message')
				});
			}
		},
		{	// ACTION
			regex: /^[\W0-9]*\([#OC]\)[\W0-9]*\* ([^ ]+) (.+)/i,
			fn: function(m){
				// 1 - nick
				// 2 - text
				db.insert('messages',{
					text: m[2],
					c_id: id.channel(this.channel.name),
					u_id: id.user(m[1]),
					t_id: id.type('action')
				});
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
		var i,
			m;
		for(i in hooks){
			if((m = hooks[i].regex.exec(text))){
				hooks[i].fn.call(this,m);
				return;
			}
		}
		db.insert('messages',{
			text: text,
			c_id: id.channel(this.channel.name),
			u_id: id.user(this.user.nick),
			t_id: id.type('message')
		});
	})
	.on('join',function(){
		db.insert('messages',{
			text: '',
			c_id: id.channel(this.channel.name),
			u_id: id.user(this.user.nick),
			t_id: id.type('join')
		});
	})
	.on('part',function(){
		db.insert('messages',{
			text: '',
			c_id: id.channel(this.channel.name),
			u_id: id.user(this.user.nick),
			t_id: id.type('part')
		});
	})
	.on('topic',function(old_topic,new_topic){
		db.insert('messages',{
			text: new_topic,
			c_id: id.channel(this.channel.name),
			u_id: id.user(this.user.nick),
			t_id: id.type('topic')
		});
	})
	.on('mode',function(mode,state,value){
		db.insert('messages',{
			text: (state?'+':'-')+mode+' '+value,
			c_id: id.channel(this.channel.name),
			u_id: id.user(this.user.nick),
			t_id: id.type('mode')
		});
	})
	.on('action',function(text){
		db.insert('messages',{
			text: text,
			c_id: id.channel(this.channel.name),
			u_id: id.user(this.user.nick),
			t_id: id.type('action')
		});
	})
	.on('notice',function(text){
		db.insert('messages',{
			text: text,
			c_id: id.channel(this.channel.name),
			u_id: id.user(this.user.nick),
			t_id: id.type('notice')
		});
	})
	.on('datechange',function(){
		var i,
			channels = server.channels,
			c;
		for(i in channels){
			c = channels[i];
			if(c.active){
				db.insert('messages',{
					text: c.topic,
					c_id: id.channel(c.name),
					u_id: id.user(server.name),
					t_id: id.type('datechange')
				});
			}
		}
	})
	.on('quit',function(text,channels){
		for(var i in channels){
			if(channels[i].active){
				db.insert('messages',{
					text: text,
					c_id: id.channel(channels[i].name),
					u_id: id.user(this.user.nick),
					t_id: id.type('quit')
				});
			}
		}
	});