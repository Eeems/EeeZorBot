fs.mkdirParent("data/logs/");
fs.mkdirParent('data/templates/');
if(!fs.exists('data/templates/chatlog.html')){
    var template = '<html>\n\t<head>\n\t\t<title>\n\t\t\t{Title}\n\t\t</title>\n\t</head>\n\t<body>\n\t\t{Item(\n\t\t\t<a href="{Link}" name="{Anchor}">\n\t\t\t\t{timestamp}\n\t\t\t</a>\n\t\t\t{Text}\n\t\t\t<br/>\n\t\t)}\n\t\t<a name="end"></a>\n\t</body>\n</html>';
    fs.writeFile('data/templates/chatlog.html',template,function(err) {
        if(err) {
    		disp.error(err);
		}else{
			disp.log("No chat log template found. Creating default.");
		}
	});
}
var Settings = regSettings('logServer',{
    // Port to run the server on
	port: 9002,
	// How quickly to check if the port is in use
	check_interval: 1000,
	// how many times to check before failing to start
	check_timeout: 10
});
listen(/^.+/i,function(match,data,replyTo,connection){
	var nick,data2;
	if(replyTo===null){
		replyTo = "- server -";
	}else{
		try{
			nick = (/^:([^!]+)!.*PRIVMSG ([^ ]+) :(.+)$/i).exec(data)[1];
			data = (/^:([^!]+)!.*PRIVMSG ([^ ]+) :(.+)$/i).exec(data)[3];
			if(nick.toLowerCase() == 'omnomirc'){
				if((data2 = (/\([#O]\).?<(\w+)>(.+)$/).exec(data)) !== null){
					nick = data2[1];
					data = data2[2].trim();
				}else if((data2 = (/\([#O]\).? *(.+) has quit .+$/).exec(data)) != null){
					console.log(data2);
					
				}
			}
            replyTo = replyTo.trim().toLowerCase();
		}catch(e){
			disp.error(e)
			disp.log("Defaulting to '- server -' replyTo");
			replyTo = "- server -";
		}
	}
	var d = new Date();
	var p = connection.config.host+" "+connection.config.port+"/"+replyTo+"/"+d.toDateString();
	if(replyTo == "- server -" && (new RegExp("^:(.+) 372 "+connection.config.nick+" :(.+)$")).exec(data) === null){
		save(p,{
			msg: ">>>	"+data
		});
	}else if(data.indexOf("\x01ACTION ")!=-1){
		save(p,{
			msg: data.substr(data.indexOf("\x01ACTION ")+8,data.length-9),
			user: nick,
			type: 'action'
		});
	}else{
		save(p,{
			msg: data,
			user: nick
		});
	}
});
listen(/^:([^!]+).*PART ([^ ]+) :$/i,function(match,data,replyTo,connection){
	replyTo = match[2].substr(1).trim().toLowerCase();
	var d = new Date();
	save(connection.config.host+" "+connection.config.port+"/#"+replyTo+"/"+d.toDateString(),{
		user: match[1],
		type: 'part'
	});
});
listen(/^:([^!]+).*JOIN :([^ ]+)$/i,function(match,data,replyTo,connection){
	replyTo = match[2].substr(1).trim().toLowerCase();
	var d = new Date();
	save(connection.config.host+" "+connection.config.port+"/#"+replyTo+"/"+d.toDateString(),{
		type: 'join',
		user: match[1]
	});
});
reply_listen(function(replyTo,msg,connection){
	if(replyTo===null){
		replyTo = "- server -";
	}else{
		replyTo = replyTo.trim().toLowerCase();
	}
	var d = new Date();
	save(connection.config.host+" "+connection.config.port+"/#"+replyTo+"/"+d.toDateString(),{
		msg: msg,
		user: connection.config.nick
	});
});
send_listen(/^.+/i,function(match,msg,connection){
	var d = new Date();
	save(connection.config.host+" "+connection.config.port+"/- server -/"+d.toDateString(),{
		msg: "<<<	"+msg
	});
});
hook('quit',function(){
	var d = new Date();
	save(this.config.host+" "+this.config.port+"/- server -/"+d.toDateString(),{
		msg: "*Connection Quit*"
	});
});
hook('reconnect',function(){
	var d = new Date();
	save(this.config.host+" "+this.config.port+"/- server -/"+d.toDateString(),{
		msg: "*Reconnected*"
	});
});
hook('connect',function(){
	var d = new Date();
	save(this.config.host+" "+this.config.port+"/- server -/"+d.toDateString(),{
		msg: "*Connected*"
	});
});
hook('timeout',function(){
	var d = new Date();
	save(this.config.host+" "+this.config.port+"/- server -/"+d.toDateString(),{
		msg: "*Connection Timeout*"
	});
});
disp.alert("Starting Log Server");
function addZero(num){
	return (String(num).length < 2) ? num = String("0" + num) :  num = String(num);
}
function save(log,o){
	fs.mkdirParent('data/logs/'+path.dirname(log));
	var d = new Date(),n = {};
	if(typeof o.type === 'undefined'){
		n.type = 'privmsg';
	}else{
		n.type = o.type;
	}
	if(typeof o.user === 'undefined'){
		n.user = '- server -';
	}else{
		n.user = o.user;
	}
	if(typeof o.msg !== 'undefined'){
		n.msg = o.msg;
	}
	n.date = d.getTime()+d.getTimezoneOffset()*60*1000;
	switch(config.logtype){
		case 'listdb':
				var l = listdb.getDB('logs/'+log);
				l.add(JSON.stringify(n));
				break;
		case 'txt': default:
			switch(n.type){
				case 'part':
					n.msg = "* "+n.user+" has left the channel";
					break;
				case 'join':
					n.msg = "* "+n.user+" has joined the channel";
					break;
				case 'action':
					n.msg = "* "+n.user+" "+n.msg;
					break;
				default:
					n.msg = "<"+n.user+">	"+n.msg;
			}
			fs.createWriteStream('data/logs/'+log+'.log',{
				flags: 'a',
				encoding: 'ascii'
			}).end("["+d.getHours()+":"+addZero(d.getMinutes())+":"+addZero(d.getSeconds())+"] "+n.msg);
	}
}
function htmlEntities(str){
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
var count = 0,
	server = global.logServer = http.createServer(function (req, res) {
		function check(d){
			try{
				return fs.statSync(d).isDirectory();
			}catch(er){
				return false;
			}
		}
		var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress, ext,url = require('url').parse(req.url,true);
		switch(config.logtype){
			case 'listdb':
				ext = '.db';
				break;
			case 'txt': default:
				ext = '.log';
		}
		disp.log("Serving "+req.url+" to: "+ip);
		if(req.url == '/'){
			res.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8','Server': 'NodeBot/Logs'});
			res.write("<!doctype html>\n<html>\n\t<head>\n\t\t<link rel='icon' type='image/x-icon' href='favicon.ico' />\n\t\t<title>Logs</title>\n\t\t<script src='http://code.jquery.com/jquery-1.10.2.min.js'></script>\n\t</head>\n\t<body>");
			var logs = fs.readdirSync('data/logs/');
			if(logs){
				var i,j,f;
				for (i = 0; i < logs.length; i++){
					if(check('data/logs/'+logs[i])){
						var logdirs = fs.readdirSync('data/logs/'+logs[i]);
						if(logdirs){
							res.write('\n\t\t<h1 onclick="$(this).next().toggle();" style="cursor:pointer;">'+logs[i]+'</h1>\n\t\t<ul style="display:none;">');
							for (j = 0; j < logdirs.length; j++){
								if(
									check('data/logs/'+logs[i]+'/'+logdirs[j])
									&& logdirs[j] != '- server -'
									&& logdirs[j].substr(0,1) == '#'
								){
									var logfiles = fs.readdirSync('data/logs/'+logs[i]+'/'+logdirs[j]);
									if(logfiles){
										logfiles = logfiles.sort(function(a, b){
											return (new Date(path.basename(a,ext))).getTime()-(new Date(path.basename(b,ext))).getTime();
										});
										res.write('\n\t\t\t<li>\n\t\t\t\t<h2><span onclick="$(this).next().children().toggle()" style="cursor:pointer;">'+logdirs[j]+'</span></h2>\n\t\t\t\t<ul style="display:none;">');
										for (f = 0; f < logfiles.length; f++){
											if(path.extname(logfiles[f]) == ext){
												var c = path.basename(logfiles[f],ext);
												res.write('\n\t\t\t\t\t<li>\n\t\t\t\t\t\t<a href="?server='+logs[i]+'&channel='+logdirs[j].substr(1,logfiles[f].length-1)+'&date='+c+'">'+c+'</a>\n\t\t\t\t\t</li>');
											}
										}
										res.write('\n\t\t\t\t</ul>\n\t\t\t</li>');
									}
								}
							}
							res.write('\n\t\t</ul>');
						}
					}
				}
			}
			res.end("\n\t</body>\n</html>");
		}else if(req.url == '/favicon.ico'){
			fs.readFile('data/favicon.ico', "binary", function (err,file) {
				if (err) {
					res.writeHead(500, {'Content-Type':'image/x-icon','Server':'NodeBot/Logs'});
					res.write(err+"\n");
					res.end();
					return;
				}
				res.writeHead(200,{'Content-Type':'image/x-icon','Server':'NodeBot/Logs'});
				res.write(file, "binary");
				res.end();
			});
		}else{
			var log = url.query,e,m,i,l,n,td,d = new Date();
			if(log.date == 'today'){
				n = d.toDateString();
			}else{
				n = log.date;
			}
			switch(config.logtype){
				case 'listdb':
					res.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8','Server': 'NodeBot/Logs'});
					l = listdb.getDB('logs/'+log.server+'/#'+log.channel+'/'+n).getAll();
					res.write('<html><head><title>'+log.server+' #'+log.channel+' '+n+'</title></head><body>');
					for(i in l){
                        try{
                            e = JSON.parse(l[i]);
                            e.msg = htmlEntities(e.msg).replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig,function(url){
                                return '<a href="'+url+'">'+url+'</a>';
                            }).replace(/[\x02\x1f\x16\x0f]|\x03(\d{0,2}(?:,\d{0,2})?)/g,"");
                            e.user = htmlEntities(e.user);
                            switch(e.type){
                                case 'join':
                                    m = '<strong>*'+e.user+' joined the channel</strong>';
                                    break;
                                case 'part':
                                    m = '<strong>*'+e.user+' left the channel</strong>';
                                    break;
                                case 'privmsg':
                                    m = '&lt;	<strong>'+e.user+'</strong>	&gt;	'+e.msg;
                                    break;
                                case 'action':
                                    m = '<strong>* '+e.user+' '+e.msg+'</strong>';
                                    break;
                                default:
                                    m = 'error! '+e.type;
                            }
                            td = new Date(e.date);
                            res.write("\t<a href=\"?server="+log.server+"&channel="+log.channel+"&date="+n+"#"+e.date+'" name="'+e.date+'">'+'['+addZero(td.getUTCHours())+':'+addZero(td.getUTCMinutes())+':'+addZero(td.getUTCSeconds())+']</a>'+m+"<br/>\n");
                        }catch(e){
                            disp.log("Invalid character in log");
                            res.write("\t*Please contact the owner of this bot. The logs have invalid characters*<br/>\n");
                        }
					}
					res.end('<a name="end"></a></body></html>');
				break;
				case 'txt': default:
					res.writeHead(200, {'Content-Type': 'text/plain;','Server': 'NodeBot/Logs'});
					try{
						res.end(fs.readFileSync('data/logs/'+log.server+'/#'+log.channel+'/'+n+ext,'ascii'));
					}catch(e){
						res.end("Error opening log: "+log.server+'/#'+log.channel+'/'+n+ext);
					}
			}
		}
	}).listen(Settings.port);
server.on("close",function(){
	disp.alert("Ending Log Server");
});
server.on('error',function(e){
	if(e.code == 'EADDRINUSE'){
		setTimeout(function(){
			if(count < Settings.check_timeout){
				count++;
				disp.log("Port "+Settings.port+" in use, reconnect attempt: "+count);
				try{
					server.close();
				}catch(e){}
				server.listen(Settings.port);
			}else{
				count = 0;
				disp.log('Port in use, stopping');
			}
		},Settings.check_interval);
	}else{
		disp.trace();
		disp.error(e);
	}
});
hook('unload',function(){
	try{
		server.close();
		global.logServer = null;
		addZero = null;
		save = null;
		htmlEntities = null;
	}catch(e){
		disp.alert("Log Server Already Ended");
	}
});
disp.alert("Logging enabled");