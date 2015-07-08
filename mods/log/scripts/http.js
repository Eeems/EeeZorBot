/*jshint multistr: true */
// Start http server if it isn't running already
var settings = (function(){
		var s = require('../etc/config.json').logs.server,
			ss = require('../etc/config.json').logs.websocket;
		if(s.listeners === undefined){
			s.listeners = [];
		}
		s.websocket = {
			host: ss.host,
			port: ss.port
		};
		return s;
	})(),
	servers = [],
	dns = require('dns'),
	url = require('url'),
	deasync = require('deasync'),
	listdb = require('./listdb.js'),
	html = (function(){
		this.htmlent = function(text){
			return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
		};
		this.getColour = function(num,def){
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
		this.chunk = function(c,bg,style){
			this.style = style===undefined?'':style;
			return "<span style='color:"+this.getColour(c,'black')+";background-color:"+this.getColour(bg,'transparent')+";"+this.style+"'>";
		};
		this.parse = function(m){
			var c,
				bg,
				t=m[0];
			switch(t){
				case "\x0f":
					t = "\x03";
					this.style = '';
				break;
				case "\x1f":
					t = "\x03";
					this.style += "text-decoration:underline;";
				break;
				case "\x02":
					t="\x03";
					this.style += "font-weight:bold;";
				break;
				case "\x1D":case "\x16":
					t="\x03";
					this.style += "font-style:italic;";
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
			return '</span>'+chunk(c,bg,this.style);
		};
		this.colourNick = function(nick,id,template){
			nick = html.htmlent(nick);
			var hash = (function(){
					var h = 0,
						i;
					for(i=0;i<nick.length;i++){
						h = nick.charCodeAt(i)+(h<<6)+(h<<16)-h;
					}
					return h;
				})(),
				deg = hash%360,
				hue = deg<0?360+deg:deg,
				light = hue>=30&&hue<=210?30:50,
				saturation = 20+Math.abs(hash)%80;
			return template.compile({
				nick: nick,
				hue: hue,
				saturation: saturation,
				light: light,
				id: id
			});
		};
		this.ts = function(d){
			return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
		};
		this.line_json = function(m,id){
			id = id===undefined?m.id:id;
			var t = html.htmlent(m.text)
				.replace(/\b((?:\w*:?\/\/)?\w+\.\w\w+\/?[A-Za-z0-9_.-~\-]*#?[A-Za-z0-9_.\-~\-]*)\b/g,links)
				.replace(/[\x02\x1f\x16\x0f]|\x03(\d{0,2}(?:,\d{0,2})?)/g,html.parse)
				.trim();
			return {
				id: id,
				type: m.type,
				datetime: m.datetime,
				time: m.time,
				body: html.chunk()+(templates.types[m.type]?templates.types[m.type]:templates.types.message).compile({
					user: html.colourNick(m.user,m.u_id,templates.user),
					text: t,
					channel: m.channel,
					server: m.server,
				})+'</span>'
			};
		};
		return this;
	})(),
	templates = {
		index: template(_dirname+'/../www/index.html'),
		server: template(_dirname+'/../www/server.html'),
		log: template(_dirname+'/../www/log.html'),
		user: template(_dirname+'/../www/log/user.html'),
		errors: {
			'401': template(_dirname+'/../www/errors/401.html'),
			'404': template(_dirname+'/../www/errors/404.html')
		},
		stats: {
			index: template(_dirname+'/../www/stats/index.html'),
			server: template(_dirname+'/../www/stats/server.html'),
			channel: template(_dirname+'/../www/stats/channel.html'),
			user: template(_dirname+'/../www/stats/user.html')
		},
		types: {
			action: template(_dirname+'/../www/log/types/action.html'),
			datechange: template(_dirname+'/../www/log/types/datechange.html'),
			join: template(_dirname+'/../www/log/types/join.html'),
			message: template(_dirname+'/../www/log/types/message.html'),
			mode: template(_dirname+'/../www/log/types/mode.html'),
			notice: template(_dirname+'/../www/log/types/notice.html'),
			part: template(_dirname+'/../www/log/types/part.html'),
			quit: template(_dirname+'/../www/log/types/quit.html'),
			topic: template(_dirname+'/../www/log/types/topic.html')
		}
	},
	scripts = {
		'socket.js': tools.file.subscribe(_dirname+'/../www/scripts/socket.js'),
		'app.js': tools.file.subscribe(_dirname+'/../www/scripts/app.js'),
		'app.css': tools.file.subscribe(_dirname+'/../www/scripts/app.css'),
		'template.js': tools.file.subscribe(_dirname+'/../www/scripts/template.js'),
	},
	realdomains = (function(){
		var i,
			rd = new Listdb('realdomains').all(),
			realdomains = [],
			item;
		for(i in rd){
			try{
				item = JSON.parse(rd[i]);
				realdomains[item.domain] = item.valid;
			}catch(e){}
		}
		return realdomains;
	})(),
	hostname = function(href){
		var hostname = url.parse(href).hostname;
		return typeof hostname!='string'?url.parse('http://'+href).hostname:hostname;
	},
	toUrl = function(href){
		var u = url.parse(href);
		if(typeof u.hostname!='string'){
			u = url.parse('http://'+href);
		}
		return url.format(u);
	},
	isdomain = function(href){
		href = hostname(href);
		var sync = true,
			data;
		if(realdomains[href]===undefined){
			try{
				dns.lookup(href,function(e,a){
					data = e instanceof Error?false:typeof a=='string';
					sync = false;
				});
			}catch(e){
				log.trace(e);
				sync = false;
				data = false;
			}
			while(sync){
				deasync.sleep(1);
			}
			realdomains[href] = data;
		}else if(realdomains[href]){
			data = true;
		}
		return data;
	},
	links = function(href){
		return isdomain(href)?'<a href="'+toUrl(href)+'">'+href+'</a>':href;
	},
	handle = function(req,res){
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
						res.write(templates.index.compile({
							servers: r
						}));
						res.end();
					});
				}else if(args.length > 0){
					switch(args[0]){
						case 'scripts':
							if(args.length == 1){
								res.statusCode = 401;
								res.write(templates.errors['401'].compile({
									path: 'scripts/'
								}));
							}else if(args.length == 2 && scripts[args[1]]){
								res.write(scripts[args[1]].data);
							}else{
								res.statusCode = 404;
								res.write(templates.errors['404'].compile());
							}
							res.end();
						break;
						case 'stats':
							if(args.length == 1){
								db.query("\
									SELECT	id,\
											name\
									FROM servers\
								",function(e,servers){
									if(e){
										throw e;
									}
									res.write(templates.stats.index.compile({
										servers: servers
									}));
									res.end();
								});
							}else{
								if(args.length<4 && args.length>2){
									switch(args[1]){
										case 'user':
											db.query("\
												select	name,\
														id\
												from users\
												where id = ?\
											",[args[2]],function(e,user){
												if(e){
													throw e;
												}
												user = user[0];
												db.query("\
													select	c.s_id,\
															s.name as server,\
															c.id,\
															c.name,\
															count(m.id) as \"lines\"\
													from channels c\
													join servers s\
														on s.id = c.s_id\
													left outer join messages m\
														on m.c_id = c.id\
													where m.u_id = ?\
														and left(c.name,1) = '#'\
													group by c.s_id,c.id\
												",[user.id],function(e,channels){
													if(e){
														throw e;
													}
													user.channels = channels;
													res.write(templates.stats.user.compile(user));
													res.end();
												});
											});
										break;
										case 'channel':
											db.query("\
												select	c.name,\
														c.id,\
														c.s_id,\
														s.name as server\
												from channels c\
												join servers s\
													on s.id = c.s_id\
												where c.id = ?\
											",[args[2]],function(e,channel){
												if(e){
													throw e;
												}
												channel = channel[0];
												db.query("\
													select	u.id,\
															u.name,\
															count(m.id) as \"lines\"\
													from channels c\
													left outer join messages m\
														on m.c_id = c.id\
													join users u\
														on u.id = m.u_id\
													where c.id = ?\
													group by u.id\
												",[channel.id],function(e,users){
													if(e){
														throw e;
													}
													channel.users = users;
													res.write(templates.stats.channel.compile(channel));
													res.end();
												});
											});
										break;
										case 'server':
											db.query("\
												select	name,\
														id\
												from servers\
												where id = ?\
											",[args[2]],function(e,server){
												if(e){
													throw e;
												}
												server = server[0];
												db.query("\
													select	c.id,\
															c.name,\
															count(m.id) as \"lines\",\
															count(distinct u.id) as users\
													from channels c\
													left outer join messages m\
														on m.c_id = c.id\
													join users u\
														on u.id = m.u_id\
													where c.s_id = ?\
														and left(c.name,1) = '#'\
													group by c.id\
												",[server.id],function(e,channels){
													if(e){
														throw e;
													}
													server.channels = channels;
													db.query("\
														select	u.id,\
																u.name,\
																count(m.id) as \"lines\",\
																count(distinct c.id) as channels\
														from users u\
														left outer join messages m\
															on m.u_id = u.id\
														join channels c\
															on c.id = m.c_id\
														where c.s_id = ?\
															and left(c.name,1) = '#'\
														group by u.id\
													",[server.id],function(e,users){
														if(e){
															throw e;
														}
														server.users = users;
														res.write(templates.stats.server.compile(server));
														res.end();
													});
												});
											});
										break;
										default:
											res.statusCode = 404;
											res.write(templates.errors['404'].compile({
												message: 'Not Implemented'
											}));
											res.end();
									}
								}else{
									res.statusCode = 404;
									res.write(templates.errors['404'].compile({
										message: 'Invalid arguments'
									}));
									res.end();
								}
							}
						break;
						case 'api':
							res.setHeader('Content-Type','application/json');
							if(args.length < 3){
								res.statusCode = 401;
								res.write(JSON.stringify({
									msg: 'Access Denied'
								}));
								res.end();
							}else{
								try{
									switch(args[1]){
										case 'get':
											if(args.length < 4){
												res.statusCode = 401;
												res.write(JSON.stringify({
													msg: 'Access Denied'
												}));
												res.end();
											}else{
												switch(args[2]){
													case 'line':
														db.query("\
															SELECT	CONCAT(\
																		DATE_FORMAT(m.date,'%H:%i:%s'),\
																		IFNULL(\
																			(\
																				SELECT CONCAT('-',sm.id)\
																				FROM messages sm\
																				WHERE DATE_FORMAT(m.date,'%H:%i:%s') = DATE_FORMAT(sm.date,'%H:%i:%s')\
																				AND sm.id < m.id\
																				LIMIT 0,1\
																			),\
																			''\
																		)\
																	) as id,\
																	m.u_id,\
																	u.name AS user,\
																	t.name AS type,\
																	m.text,\
																	DATE_FORMAT(m.date,'%H:%i:%s') as time,\
																	DATE_FORMAT(m.date,'%Y-%m-%dT%H:%i:%sZ') as datetime,\
																	c.name as channel,\
																	s.name as server\
															FROM messages m\
															JOIN types t\
																ON t.id = m.t_id\
															JOIN users u\
																ON u.id = m.u_id\
															JOIN channels c\
																ON c.id = m.c_id\
															JOIN servers s\
																ON s.id = c.s_id\
															WHERE m.id = ?\
															ORDER BY m.date ASC\
														",[args[3]],function(e,r){
															if(e){
																throw e;
															}
															if(!r[0]){
																throw new Error('Could not find line '+args[3]);
															}
															res.write(JSON.stringify(html.line_json(r[0])));
															res.end();
														});
													break;
												}
											}
										break;
									}
								}catch(e){
									res.write(JSON.stringify({
										type: 'error',
										msg: e
									}));
									res.end();
									console.log(e);
								}
							}
						break;
						default:
							if(args.length == 1){
								db.query("\
									SELECT	id,\
											name,\
											s_id\
									FROM channels\
									WHERE s_id = ?\
									AND name like '#%'\
								",[args[0]],function(e,r){
									if(e){
										throw e;
									}
									var server = db.querySync("select name from servers where id = ?",[args[0]])[0];
									if(server!==undefined){
										res.write(templates.server.compile({
											name: server.name,
											channels: r
										}));
									}else{
										res.statusCode = 404;
										res.write(templates.errors['404'].compile({
											message: 'Server does not exist'
										}));
									}
									res.end();
								});
							}else{
								var d = new Date(+new Date),
									pastDate,
									nextDate,
									a,
									date,
									controls;
								if(args[2]===undefined){
									res.writeHead(302,{
										Location: req.url+'/'+html.ts(d)
									});
								}
								args[2] = args[2]===undefined?html.ts(d):args[2];
								a = args[2].split('-');
								date = new Date(a[0],parseInt(a[1],10)-1,a[2]);
								pastDate = new Date(date.getTime()-(24*60*60*1000));
								nextDate = new Date(date.getTime()+(24*60*60*1000));
								d = new Date(d.getFullYear(),d.getMonth(),d.getDate());
								db.query("\
									SELECT	m.id,\
											m.u_id,\
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
									AND m.date <= DATE_ADD(STR_TO_DATE(?,'%Y-%m-%d'),INTERVAL 1 DAY)\
									AND m.c_id = ?\
									ORDER BY m.date ASC\
								",[args[2],args[2],args[1]],function(e,r){
									if(e){
										throw e;
									}
									var server = db.querySync("select name from servers where id = ?",[args[0]])[0],
										channel = db.querySync("select name from channels where id = ? and name like '#%'",[args[1]])[0];
									if(server!==undefined&&channel!==undefined){
										var data = {
												s_id: args[0],
												server: server.name,
												c_id: args[1],
												channel: channel.name,
												date: args[2],
												pastDate: html.ts(pastDate),
												todayDate: html.ts(d),
												thisDate: html.ts(date),
												nextDate: html.ts(nextDate),
												messages: [],
												socketHost: settings.websocket.host,
												socketPort: settings.websocket.port
											},
											m,
											ds = {},
											id,
											i;
										for(i in r){
											m = r[i];
											m.channel = channel.name;
											m.server = server.name;
											id = m.time;
											if(ds[id]!==undefined){
												id = id+'-'+m.id;
											}
											ds[id] = true;
											data.messages.push(html.line_json(m,id));
										}
										res.write(templates.log.compile(data));
									}else{
										res.statusCode = 404;
										res.write(templates.errors['404'].compile({
											message: 'Channel does not exist'
										}));
									}
									res.end();
								});
							}
					}
				}
			break;
		}
	},
	i;
Object.observe(realdomains,function(){
	var rn = new Listdb('realdomains'),
		i,
		v;
	for(i in realdomains){
		v = JSON.stringify({
			domain: i,
			valid: realdomains[i]
		});
		if(!rn.has(v)){
			rn.add(v);
			rn.flush();
		}
	}
});
if(settings.host!==undefined&&settings.port!==undefined){
	settings.listeners.push({
		host: settings.host,
		port: settings.port
	});
}
for(i in settings.listeners){
	try{
		var l = settings.listeners[i],
			s = http.getServer(l.host,l.port).hold(script).handle(handle);
		servers.push(s);
	}catch(e){
		log.trace(e);
	}
}
script.unload = function(){
	for(var i in servers){
		servers[i].release(script);
	}
	servers = [];
};