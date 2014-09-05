server.on('topic',function(oldT,newT){
	console.log('topic changed from '+oldT+' to '+newT);
});