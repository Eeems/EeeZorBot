var test = require('tape'),
	main = require(__dirname+'/../lib/main.js');

test('todo',function(t){
	t.ok(true,'todo');
	t.end();
	setTimeout(function(){
		process.exit();
	},100);
});