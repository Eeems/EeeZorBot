var test = require('tape'),
	api = require(__dirname+'/../index.js'),
	User = api.User,
	Channel = api.Channel,
	Script = api.Script,
	Server = api.Server,
	Listdb = api.Listdb,
	tools = api.tools,
	stdin = api.stdin,
	debug = api.debug;

test('todo',function(t){
	t.ok(true,'todo');
	t.end();
	setTimeout(function(){
		process.exit();
	},100);
});