var test = require('tape'),
	api = require(__dirname+'/../index.js'),
	User = api.User,
	Channel = api.Channel,
	Script = api.Script,
	Server = api.Server,
	Listdb = api.Listdb,
	tools = api.tools,
	stdin = api.stdin,
	log = api.log,
	debug = api.debug;

test('todo',function(t){
	t.ok(api,'api');
	t.ok(api.User,'api.User');
	t.ok(api.Channel,'api.Channel');
	t.ok(api.Script,'api.Script');
	t.ok(api.Server,'api.Server');
	t.ok(api.Listdb,'api.Listdb');
	t.ok(api.tools,'api.tools');
	t.ok(api.stdin,'api.stdin');
	t.ok(api.log,'api.log');
	t.ok(api.debug,'api.debug');
	t.end();
	setTimeout(function(){
		process.exit();
	},100);
});