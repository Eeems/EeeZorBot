var test = require('tape'),
    path = require('path'),
    api = require(path.join(__dirname, '/../index.js')),
    User = api.User,
    Channel = api.Channel,
    Script = api.Script,
    Server = api.Server,
    Listdb = api.Listdb,
    tools = api.tools,
    stdin = api.stdin,
    log = api.log,
    debug = api.debug;

test('todo', function(t){
    t.ok(api, 'api');
    t.ok(User, 'api.User');
    t.ok(Channel, 'api.Channel');
    t.ok(Script, 'api.Script');
    t.ok(Server, 'api.Server');
    t.ok(Listdb, 'api.Listdb');
    t.ok(tools, 'api.tools');
    t.ok(stdin, 'api.stdin');
    t.ok(log, 'api.log');
    t.ok(debug, 'api.debug');
    t.end();
    setTimeout(function(){
        process.exit();
    }, 100);
});
