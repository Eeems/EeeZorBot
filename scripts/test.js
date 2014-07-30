server.add('test',function(){
		this.server.send('PRIVMSG '+this.channel.name+' :Test Command Recieved');
	},'lets you know if scripts are working correctly')
	.add('timeout',function(){
		this.server.socket.emit('timeout');
	},'simulates a timeout on the IRC server socket');
script.unload = function(){
	console.log('Script unloading. Running cleanup');
};