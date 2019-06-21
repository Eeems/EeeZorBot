/* global template tools log db pubsub script _dirname _root Listdb */
/* eslint no-multi-str: 0 */
/* jshint multistr: true */
// Start http server if it isn't running already
var settings = (function(){
        var c = require(require('path').join(_root, 'etc/config.json')),
            s = c.logs.server,
            ss = c.logs.websocket;
        if(s.listeners === undefined){
            s.listeners = [];
        }
        if(s.host && s.port){
            s.listeners.unshift({
                host: s.host,
                port: s.port
            });
        }
        s.websocket = {
            host: ss.host,
            port: ss.port
        };
        return s;
    })(),
    dns = require('dns'),
    url = require('url'),
    path = require('path'),
    deasync = require('deasync'),
    http = require('http'),
    tpl = template.template,
    html = (function(){
        this.htmlent = function(text){
            return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        };
        this.getColour = function(num, def){
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
            ][parseInt(num, 0)];
            return c === undefined ? def : c;
        };
        this.chunk = function(c, bg, style){
            this.style = style === undefined ? '' : style;
            return "<span style='color:" + this.getColour(c, 'black') + ';background-color:' + this.getColour(bg, 'transparent') + ';' + this.style + "'>";
        };
        this.parse = function(m){
            var c,
                bg,
                t = m[0];
            switch(t){
                case'\x0f':
                    t = '\x03';
                    this.style = '';
                    break;
                case'\x1f':
                    t = '\x03';
                    this.style += 'text-decoration:underline;';
                    break;
                case'\x02':
                    t = '\x03';
                    this.style += 'font-weight:bold;';
                    break;
                case'\x1D':case'\x16':
                    t = '\x03';
                    this.style += 'font-style:italic;';
                    break;
                case'\x03':
                    c = m[1];
                    if(/\d/.test(m[2])){
                        c += m[2];
                        if(m[3] === ','){
                            bg = m[4];
                            if(/\d/.test(m[5])){
                                bg += m[5];
                            }
                        }
                    }else if(m[2] === ','){
                        bg = m[3];
                        if(/\d/.test(m[4])){
                            bg += m[4];
                        }
                    }
                    break;
            }
            return '</span>' + this.chunk(c, bg, this.style);
        };
        this.colourNick = function(nick, id, template){
            nick = html.htmlent(nick);
            var hash = (function(){
                    var h = 0,
                        i;
                    for(i = 0; i < nick.length; i++){
                        h = nick.charCodeAt(i) + (h << 6) + (h << 16) - h;
                    }
                    return h;
                })(),
                deg = hash % 360,
                hue = deg < 0 ? 360 + deg : deg,
                light = hue >= 30 && hue <= 210 ? 30 : 50,
                saturation = 20 + Math.abs(hash) % 80;
            return template.compile({
                nick: nick,
                hue: hue,
                saturation: saturation,
                light: light,
                id: id
            });
        };
        this.ts = function(d){
            return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        };
        this.line_json = function(m, id){
            id = id === undefined ? m.id : id;
            var t = html.htmlent(m.text)
                .replace(/\b((?:\w*:?\/\/)?\w+\.\w\w+\/?[A-Za-z0-9_.-~\-&]*#?[A-Za-z0-9_.\-~]*)\b/g, links)
                .replace(/[\x02\x1f\x16\x0f]|\x03(\d{0,2}(?:,\d{0,2})?)/g, html.parse) // eslint-disable-line no-control-regex
                .trim();
            return {
                id: id,
                type: m.type,
                datetime: m.datetime,
                time: m.time,
                body: html.chunk() + (templates.types[m.type] ? templates.types[m.type] : templates.types.message).compile({
                    user: html.colourNick(m.user, m.u_id, templates.user),
                    text: t,
                    channel: m.channel,
                    server: m.server
                }) + '</span>'
            };
        };
        return this;
    })(),
    templates = {
        index: tpl(path.join(_dirname, '/../www/index.html')),
        server: tpl(path.join(_dirname, '/../www/server.html')),
        channel: tpl(path.join(_dirname, '/../www/channel.html')),
        log: tpl(path.join(_dirname, '/../www/log.html')),
        user: tpl(path.join(_dirname, '/../www/log/user.html')),
        search: tpl(path.join(_dirname, '/../www/search.html')),
        errors: {
            '401': tpl(path.join(_dirname, '/../www/errors/401.html')),
            '404': tpl(path.join(_dirname, '/../www/errors/404.html'))
        },
        stats: {
            index: tpl(path.join(_dirname, '/../www/stats/index.html')),
            server: tpl(path.join(_dirname, '/../www/stats/server.html')),
            channel: tpl(path.join(_dirname, '/../www/stats/channel.html')),
            user: tpl(path.join(_dirname, '/../www/stats/user.html'))
        },
        types: {
            action: tpl(path.join(_dirname, '/../www/log/types/action.html')),
            datechange: tpl(path.join(_dirname, '/../www/log/types/datechange.html')),
            join: tpl(path.join(_dirname, '/../www/log/types/join.html')),
            message: tpl(path.join(_dirname, '/../www/log/types/message.html')),
            mode: tpl(path.join(_dirname, '/../www/log/types/mode.html')),
            notice: tpl(path.join(_dirname, '/../www/log/types/notice.html')),
            part: tpl(path.join(_dirname, '/../www/log/types/part.html')),
            quit: tpl(path.join(_dirname, '/../www/log/types/quit.html')),
            topic: tpl(path.join(_dirname, '/../www/log/types/topic.html'))
        },
        scripts: tools.folder.watch(path.join(_dirname, '/../www/scripts/'))
    },
    realdomains = (function(){
        var rd = new Listdb('realdomains').all(),
            realdomains = [],
            item;
        rd.forEach(function(d, i){
            try{
                item = JSON.parse(d);
                realdomains[item.domain] = item.valid;
            }catch(e){} // eslint-disable-line no-empty
        });
        return realdomains;
    })(),
    flushRealDomains = function(){
        var rn = new Listdb('realdomains'),
            v, i;
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
    },
    hostname = function(href){
        var hostname = url.parse(href).hostname;
        return typeof hostname != 'string' ? url.parse('http://' + href).hostname : hostname;
    },
    toUrl = function(href){
        var u = url.parse(href);
        if(typeof u.hostname != 'string'){
            u = url.parse('http://' + href);
        }
        return url.format(u);
    },
    isdomain = function(href){
        href = hostname(href);
        var sync = true,
            data;
        if(realdomains[href] === undefined){
            try{
                dns.lookup(href, function(e, a){
                    data = e instanceof Error ? false : typeof a == 'string';
                    sync = false;
                });
            }catch(e){
                log.trace(e);
                sync = false;
                data = false;
            }
            while(sync){ // eslint-disable-line no-unmodified-loop-condition
                deasync.sleep(1);
            }
            realdomains[href] = data;
            flushRealDomains();
        }else if(realdomains[href]){
            data = true;
        }
        return data;
    },
    links = function(href){
        return isdomain(href) ? '<a href="' + toUrl(href) + '">' + href + '</a>' : href;
    },
    httpserver = http.createServer(function(req, res){
        switch(req.method){
            case'POST':
                var data = '';
                req.on('data', function(chunk){
                    data += chunk;
                });
                req.on('end', function(){
                    log.debug('Request Body: ' + data);
                });
                break;
            case'GET':
                var args = req.url.split('/').filter(Boolean); // eslint-disable-line one-var
                if(args.length === 0){
                    db.query('\
                        SELECT  id,\
                                name\
                        FROM servers\
                    ', function(e, r){
                        if(e){
                            throw e;
                        }
                        r.forEach(function(v, i){
                            require('api').servers.forEach(function(server, i){
                                if(v.name === server.name){
                                    v.online = true;
                                }
                            });
                        });
                        res.write(templates.index.compile({
                            servers: r
                        }));
                        res.end();
                    });
                }else if(args.length > 0){
                    switch(args[0]){
                        case'scripts':
                            if(args.length === 1){
                                res.statusCode = 401;
                                res.write(templates.errors['401'].compile({
                                    path: 'scripts/'
                                }));
                            }else if(args.length === 2){
                                res.write(templates.scripts.file(args[1]).data);
                            }else{
                                res.statusCode = 404;
                                res.write(templates.errors['404'].compile());
                            }
                            res.end();
                            break;
                        case'stats':
                            if(args.length === 1){
                                db.query('\
                                    SELECT  id,\
                                            name\
                                    FROM servers\
                                    ORDER BY name ASC\
                                ', function(e, servers){
                                    if(e){
                                        throw e;
                                    }
                                    servers.forEach(function(v, i){
                                        require('api').servers.forEach(function(server, i){
                                            if(v.name === server.name){
                                                v.online = true;
                                            }
                                        });
                                    });
                                    res.write(templates.stats.index.compile({
                                        servers: servers
                                    }));
                                    res.end();
                                });
                            }else{
                                if(args.length < 4 && args.length > 2){
                                    switch(args[1]){
                                        case'user':
                                            db.query('\
                                                select  name,\
                                                        id\
                                                from users\
                                                where id = ?\
                                                ORDER BY name ASC\
                                            ', [args[2]], function(e, user){
                                                if(e){
                                                    throw e;
                                                }
                                                user = user[0];
                                                db.query("\
                                                    select  c.s_id,\
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
                                                    ORDER BY s.name,c.name ASC\
                                                ", [user.id], function(e, channels){
                                                    if(e){
                                                        throw e;
                                                    }
                                                    channels.forEach(function(v, i){
                                                        require('api').servers.forEach(function(server, i){
                                                            if(server.name === v.server){
                                                                var c = server.channel(v.name);
                                                                if(c && c.active){
                                                                    v.online = true;
                                                                }
                                                            }
                                                        });
                                                    });
                                                    user.channels = channels;
                                                    res.write(templates.stats.user.compile(user));
                                                    res.end();
                                                });
                                            });
                                            break;
                                        case'channel':
                                            db.query('\
                                                select  c.name,\
                                                        c.id,\
                                                        c.s_id,\
                                                        s.name as server\
                                                from channels c\
                                                join servers s\
                                                    on s.id = c.s_id\
                                                where c.id = ?\
                                                ORDER BY name ASC\
                                            ', [args[2]], function(e, channel){
                                                if(e){
                                                    throw e;
                                                }
                                                channel = channel[0];
                                                db.query('\
                                                    select  u.id,\
                                                            u.name,\
                                                            count(m.id) as "lines"\
                                                    from channels c\
                                                    left outer join messages m\
                                                        on m.c_id = c.id\
                                                    join users u\
                                                        on u.id = m.u_id\
                                                    where c.id = ?\
                                                    group by u.id\
                                                    ORDER BY name ASC\
                                                ', [channel.id], function(e, users){
                                                    if(e){
                                                        throw e;
                                                    }
                                                    require('api').servers.forEach(function(server, i){
                                                        if(server.name === channel.server){
                                                            users.forEach(function(user, i){
                                                                var u = server.user(user.name);
                                                                if(u && u.channels.length > 0){
                                                                    user.online = true;
                                                                }
                                                            });
                                                        }
                                                    });
                                                    channel.users = users;
                                                    res.write(templates.stats.channel.compile(channel));
                                                    res.end();
                                                });
                                            });
                                            break;
                                        case'server':
                                            db.query('\
                                                select  name,\
                                                        id\
                                                from servers\
                                                where id = ?\
                                                ORDER BY name ASC\
                                            ', [args[2]], function(e, server){
                                                if(e){
                                                    throw e;
                                                }
                                                server = server[0];
                                                db.query("\
                                                    select  c.id,\
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
                                                    ORDER BY name ASC\
                                                ", [server.id], function(e, channels){
                                                    if(e){
                                                        throw e;
                                                    }
                                                    channels.forEach(function(v, i){
                                                        require('api').servers.forEach(function(s, i){
                                                            if(s.name === server.name){
                                                                var c = s.channel(v.name);
                                                                if(c && c.active){
                                                                    v.online = true;
                                                                }
                                                            }
                                                        });
                                                    });
                                                    server.channels = channels;
                                                    db.query("\
                                                        select  u.id,\
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
                                                        ORDER BY name ASC\
                                                    ", [server.id], function(e, users){
                                                        if(e){
                                                            throw e;
                                                        }
                                                        require('api').servers.forEach(function(s, i){
                                                            if(s.name === server.name){
                                                                users.forEach(function(user, i){
                                                                    var u = s.user(user.name);
                                                                    if(u && u.channels.length > 0){
                                                                        user.online = true;
                                                                    }
                                                                });
                                                            }
                                                        });
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
                        case'api':
                            res.setHeader('Content-Type', 'application/json');
                            if(args.length < 3){
                                res.statusCode = 401;
                                res.write(JSON.stringify({
                                    msg: 'Access Denied'
                                }));
                                res.end();
                            }else{
                                try{
                                    switch(args[1]){
                                        case'get':
                                            if(args.length < 4){
                                                res.statusCode = 401;
                                                res.write(JSON.stringify({
                                                    msg: 'Access Denied'
                                                }));
                                                res.end();
                                            }else{
                                                switch(args[2]){
                                                    case'line':
                                                        db.query("\
                                                            SELECT  CONCAT(\
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
                                                        ", [args[3]], function(e, r){
                                                            if(e){
                                                                throw e;
                                                            }
                                                            if(!r[0]){
                                                                throw new Error('Could not find line ' + args[3]);
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
                        case'search':
                            args[1] = decodeURIComponent(args[1] === undefined ? '' : args[1]);
                            args[2] = args[2] === undefined ? 0 : parseInt(args[2], 10);
                            var amount = 40; // eslint-disable-line one-var
                            db.query("\
                                SELECT  m.id,\
                                        MATCH(m.text) AGAINST (? IN BOOLEAN MODE) AS relevance,\
                                        CONCAT(c.s_id,\
                                            CONCAT('/',\
                                                CONCAT(\
                                                    m.c_id,\
                                                    CONCAT(\
                                                        '/',\
                                                        DATE_FORMAT(m.date,'%Y-%m-%d')\
                                                    )\
                                                )\
                                            )\
                                        ) as url\
                                FROM messages m\
                                JOIN channels c\
                                    on c.id = m.c_id\
                                    and c.name like '#%'\
                                JOIN users u\
                                    ON u.id = m.u_id\
                                WHERE MATCH(m.text) AGAINST(? IN BOOLEAN MODE)\
                                OR lower(u.name) like lower(?)\
                                ORDER BY relevance DESC, date DESC\
                                LIMIT ?,?\
                            ", [args[1], args[1], args[1], args[2] * amount, amount], function(e, r){
                                if(e){
                                    throw e;
                                }
                                var lines = [];
                                r.forEach(function(v, i){
                                    var done = false;
                                    http.get('http://' + settings.listeners[0].host + ':' + settings.listeners[0].port + '/api/get/line/' + v.id, function(res){
                                        var data = '';
                                        res.on('data', function(chunk){
                                            data += chunk;
                                        });
                                        res.on('end', function(){
                                            data = JSON.parse(data);
                                            data.url = v.url + '#' + data.id;
                                            lines.push(data);
                                            done = true;
                                        });
                                    }).on('error', function(){
                                        done = true;
                                    });
                                    while(!done){ // eslint-disable-line no-unmodified-loop-condition
                                        deasync.sleep(1);
                                    }
                                });
                                var scope = { // eslint-disable-line one-var
                                    term: html.htmlent(args[1]),
                                    lines: lines,
                                    page: args[2]
                                };
                                if(args[2] > 0){
                                    scope.previousPage = args[2] - 1;
                                }
                                if(r.length === amount){
                                    scope.nextPage = args[2] + 1;
                                }
                                res.write(templates.search.compile(scope));
                                res.end();
                            });
                            break;
                        default:
                            if(args.length === 1){
                                db.query("\
                                    SELECT  id,\
                                            name,\
                                            s_id\
                                    FROM channels\
                                    WHERE s_id = ?\
                                    AND name like '#%'\
                                ", [args[0]], function(e, r){
                                    if(e){
                                        throw e;
                                    }
                                    var server = db.querySync('select name from servers where id = ?', [args[0]])[0];
                                    if(server !== undefined){
                                        r.forEach(function(v, i){
                                            require('api').servers.forEach(function(s, i){
                                                if(server.name === s.name){
                                                    var c = s.channel(v.name);
                                                    if(c && c.active){
                                                        v.online = true;
                                                    }
                                                }
                                            });
                                        });
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
                                var server = db.querySync('select name from servers where id = ?', [args[0]])[0], // eslint-disable-line one-var
                                    channel = db.querySync("select name from channels where id = ? and name like '#%'", [args[1]])[0];
                                if(args[2] === undefined){
                                    db.query("\
                                        SELECT  DATE_FORMAT(`date`,'%Y-%m-%d') as \"date\"\
                                        FROM `messages`\
                                        where c_id = ?\
                                        group by year(date), month(date), day(date)\
                                        order by year(date), month(date), day(date);\
                                    ", [args[1]], function(e, r){
                                        if(e){
                                            throw e;
                                        }
                                        res.write(templates.channel.compile({
                                            dates: r,
                                            c_id: args[1],
                                            name: server.name + channel.name,
                                            channel: channel.name
                                        }));
                                        res.end();
                                    });
                                }else{
                                    var d = new Date(+new Date()), // eslint-disable-line one-var
                                        pastDate,
                                        nextDate,
                                        a,
                                        date;
                                    a = args[2].split('-');
                                    date = new Date(a[0], parseInt(a[1], 10) - 1, a[2]);
                                    pastDate = new Date(date.getTime() - (24 * 60 * 60 * 1000));
                                    nextDate = new Date(date.getTime() + (24 * 60 * 60 * 1000));
                                    d = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                    db.query("\
                                        SELECT  m.id,\
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
                                    ", [args[2], args[2], args[1]], function(e, r){
                                        if(e){
                                            throw e;
                                        }
                                        if(server !== undefined && channel !== undefined){
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
                                                ds = {},
                                                id;
                                            if(r){
                                                r.forEach(function(m, i){
                                                    m.channel = channel.name;
                                                    m.server = server.name;
                                                    id = m.time;
                                                    if(ds[id] !== undefined){
                                                        id = id + '-' + m.id;
                                                    }
                                                    ds[id] = true;
                                                    data.messages.push(html.line_json(m, id));
                                                });
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
                }
                break;
        }
    }),
    i;
pubsub.sub('log-ws', function(data){
    switch(data.action){
        case'config':
            settings.websocket = data.data;
            break;
    }
});
pubsub.pub('log-ws', {
    action: 'get',
    name: 'config'
});
for(i in settings.listeners){
    try{
        var l = settings.listeners[i]; // eslint-disable-line one-var
        httpserver.listen(l.port, l.host);
    }catch(e){
        log.trace(e);
    }
}
script.unload = function(){
    httpserver.close();
};
