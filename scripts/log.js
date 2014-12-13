/*jshint multistr: true */
// Make sure database is set up. Create tables if missing
// and create indexes if missing
server.debug(' |  |  |- Setting up database');
db.multiQuerySync([
	"\
		CREATE TABLE IF NOT EXISTS types (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			name varchar(10) UNIQUE KEY NOT NULL\
		)\
	",
	"\
		CREATE TABLE IF NOT EXISTS users (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			name varchar(30) UNIQUE KEY NOT NULL\
		)\
	",
	"\
		CREATE TABLE IF NOT EXISTS servers (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			name varchar(63) UNIQUE KEY NOT NULL,\
			host varchar(400),\
			port int\
		)\
	",
	"\
		CREATE TABLE IF NOT EXISTS channels (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			s_id int,\
			name varchar(50) NOT NULL,\
			INDEX i_channels_s_id(s_id),\
			FOREIGN KEY(s_id)\
				REFERENCES servers(id)\
				ON DELETE CASCADE\
				ON UPDATE CASCADE\
		)\
	",
	"\
		CREATE TABLE IF NOT EXISTS messages (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			date timestamp DEFAULT CURRENT_TIMESTAMP,\
			t_id int,\
			c_id int,\
			u_id int,\
			text varchar(512),\
			INDEX i_logs_t_id(t_id),\
			INDEX i_logs_c_id(c_id),\
			INDEX i_logs_u_id(u_id),\
			FOREIGN KEY (t_id)\
				REFERENCES types(id)\
				ON DELETE RESTRICT\
				ON UPDATE CASCADE,\
			FOREIGN KEY (c_id)\
				REFERENCES channels(id)\
				ON DELETE CASCADE\
				ON UPDATE CASCADE,\
			FOREIGN KEY (u_id)\
				REFERENCES users(id)\
				ON DELETE RESTRICT\
				ON UPDATE CASCADE\
		)\
	",
	"\
		CREATE OR REPLACE VIEW messages_v AS\
			SELECT	m.id,\
					s.name AS server,\
					c.name AS channel,\
					u.name AS user,\
					t.name AS type,\
					m.text,\
					m.date\
			FROM messages m\
			JOIN channels c\
				ON c.id = m.c_id\
			JOIN servers s\
				ON s.id = c.s_id\
			JOIN users u\
				ON u.id = m.u_id\
			JOIN types t\
				ON t.id = m.t_id\
			ORDER BY m.date ASC, m.id ASC\
	"
]);
// Start http server if it isn't running already
var settings = require('../etc/config.json').logs.server,
	serv = http.getServer(settings.host,settings.port).hold(script),
	dns = require('dns'),
	url = require('url'),
	deasync = require('deasync'),
	realdomains = {},
	hostname = function(href){
		var hostname = url.parse(href).hostname;
		return typeof hostname!='string'?url.parse('http://'+href).hostname:hostname;
	},
	toUrl = function(href){
		var u = url.parse(href);
		if(typeof hostname!='string'){
			u = url.parse('http://'+href);
		}
		return url.format(u);
	},
	isdomain = function(href){
		href = hostname(href);
		var sync = true,
				data;
			if(realdomains[href]===undefined){
				dns.lookup(hostname,function(e,a){
					data = typeof a=='string';
					sync = false;
				});
				while(sync){
					deasync.sleep(1);
				}
				realdomains[href] = data;
			}else{
				data = true;
			}
			return data;
		},
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
if(serv._holds.length == 1){
	serv.handle(function(req,res){
		switch(req.method){
			case 'POST':
				var data = '';
				req.on('data',function(chunk){
					data += chunk;
				});
				req.on('end',function(){
					log.debug('Request Body: '+data);
				});
			break;
			case 'GET':
				var args = req.url.split('/').filter(Boolean);
				if(args.length === 0){
					db.query("\
						SELECT	id,\
								name\
						FROM servers\
					",function(e,r){
						if(e){
							throw e;
						}
						res.write("<html><head></head><body><strong><a href=\"/\">Logs</a></strong><br/>");
						for(var i in r){
							res.write("<a href=\"/"+r[i].id+"\">"+r[i].name+"</a><br/>");
						}
						res.write("</body></html>");
						res.end();
					});
				}else if(args.length == 1){
					db.query("\
						SELECT	id,\
								name\
						FROM channels\
						WHERE s_id = ?\
						AND name like '#%'\
					",[args[0]],function(e,r){
						if(e){
							throw e;
						}
						var server = db.querySync("select name from servers where id = ?",[args[0]])[0];
						if(server!==undefined){
							res.write("<html><head></head><body><strong><a href=\"/\">Logs</a> "+server.name+"</strong><br/>");
							for(var i in r){
								res.write("<a href=\"/"+args[0]+'/'+r[i].id+"\">"+r[i].name+"</a><br/>");
							}
							res.write("</body></html>");
						}else{
							res.statusCode = 404;
							res.write("<html><head></head><body><a href=\"/\">Logs</a><br/>Not found</body></html>");
						}
						res.end();
					});
				}else{
					var ts = function(d){
							return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
						},
						d = new Date(+new Date),
						today = new Date(d.getFullYear(),d.getMonth()+1,d.getDate()),
						pastDate = new Date(),
						nextDate = new Date(),
						a,
						date,
						controls;
					args[2] = args[2]===undefined?ts(d):args[2];
					a = args[2].split('-');
					date = new Date(a[0],a[1],a[2]);
					pastDate.setDate(date.getDate()-1);
					nextDate.setDate(date.getDate()+1);
					controls = "<a href=\"/"+args[0]+'/'+args[1]+'/'+ts(pastDate)+"\">&lt;&lt</a> "+(date.getTime()==today.getTime()?'today':"<a href=\"/"+args[0]+'/'+args[1]+'/'+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()+"\">today</a>")+" <a href=\"/"+args[0]+'/'+args[1]+'/'+ts(nextDate)+"\">&gt;&gt</a>";
					db.query("\
						SELECT	m.id,\
								u.name AS user,\
								t.name AS type,\
								m.text,\
								DATE_FORMAT(m.date,'%H:%i:%s') as time,\
								DATE_FORMAT(m.date,'%Y-%m-%dT%H:%i:%sZ') as datetime\
						FROM messages m\
						JOIN types t\
							ON t.id = m.t_id\
						JOIN users u\
							ON u.id = m.u_id\
						WHERE m.date >= STR_TO_DATE(?,'%Y-%m-%d')\
						AND m.date <= STR_TO_DATE(?,'%Y-%m-%d')+1\
						AND m.c_id = ?\
						ORDER BY m.date ASC\
					",[args[2],args[2],args[1]],function(e,r){
						if(e){
							throw e;
						}
						var server = db.querySync("select name from servers where id = ?",[args[0]])[0],
							channel = db.querySync("select name from channels where id = ? and name like '#%'",[args[1]])[0];
						if(server!==undefined&&channel!==undefined){
								res.write("<!doctype html><html>\n<head><meta charset='utf-8'/><title>"+server.name+channel.name+"</title><style>span.line:target{display:inline-block;width:100%;background-color:yellow;}</style></head>\n<body><strong><a href=\"/\">Logs</a> <a href=\"/"+args[0]+"\">"+server.name+'</a> '+channel.name+' '+args[2]+"</strong><br/>"+controls+"<pre>");
								var i,m,t,
									end = '',
									htmlent = function(text){
										return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
									},
									parse = function(m){
										var style="",
											c,
											bg,
											t=m[0];
										switch(t){
											case "\x0f":
												t = "\x03";
												style="text-decoration:none;font-weight:normal;text-decoration:none;";
												c=1; // black
												bg=0; //white
											break;
											case "\x1f":
												t = "\x03";
												style="text-decoration:underline;";
											break;
											case "\x02":
												t="\x03";
												style="font-weight:bold;";
											break;
											case "\x03":
												c=m[1];
												if(/\d/.test(m[2])){
													c+=m[2];
													if(m[3] == ','){
														bg = m[4];
														if(/\d/.test(m[5])){
															bg+=m[5];
														}
													}
												}else if(m[2] == ','){
													bg = m[3];
													if(/\d/.test(m[4])){
														bg+=m[4];
													}
												}
											break;
										}
										if(t == "\x03"){
											var getColour = function(num,def){
												var c = [
													'white',
													'black',
													'blue',
													'green',
													'red',
													'brown',
													'purple',
													'orange',
													'yellow',
													'lime',
													'teal',
													'aqua',
													'royalblue',
													'fuchsia',
													'grey',
													'silver'
												][parseInt(num,0)];
												return c===undefined?def:c;
											};
											end += '</span>';
											return "<span style='color:"+getColour(c,'inherit')+";background-color:"+getColour(bg,'transparent')+";display:inline-block;"+style+"'>";
										}
										return '';
								},
								links = function(href){
									return isdomain(href)?'<a href="'+toUrl(href)+'">'+href+'</a>':href;
								},
								ds = {},
								id;
							for(i in r){
								m = r[i],
								t = htmlent(m.text)
									.replace(/[\x02\x1f\x16\x0f]|\x03(\d{0,2}(?:,\d{0,2})?)/g,parse)
									.replace(/\b((?:\w*:?\/\/)?\w+\.\w\w+\/?[A-Za-z0-9_.-~]*)\b/g,links)
									.trim();
								id = m.time;
								if(ds[id]!==undefined){
									id = id+'-'+m.id;
								}
								ds[id] = true;
								res.write('<span class="line" id="'+id+'">[<a href="#'+id+'"><time datetime="'+m.datetime+'">'+m.time+'</time></a>] '+m.type+' &lt;<span style="color:black;background-color:wite;display:inline-block;text-decoration:none;font-weight:normal;text-decoration:none;">'+htmlent(m.user)+'&gt; '+t+end+"</span></span>\n");
							}
							res.write("</pre>"+controls+"</body></html>");
						}else{
							res.statusCode = 404;
							res.write("<html><head></head><body><a href=\"/\">Logs</a><br/>Not found</body></html>");
						}
						res.end();
					});
				}
			break;
		}
	});
}
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
script.unload = function(){
	serv.release(script);
};