/* global stdin Listdb */
var getrd = function(){
    var rd = new Listdb('realdomains').all(),
        realdomains = {},
        item;
    rd.forEach(function(json, i){
        try{
            item = JSON.parse(json);
            realdomains[item.domain] = item.valid;
        }catch(e){}
    });
    return realdomains;
};
stdin.add('dns', function(argv){
    var i,
        realdomains = getrd();
    if(argv.length > 1){
        var d; // eslint-disable-line one-var
        for(i = 1; i < argv.length; i++){
            d = argv[i];
            if(realdomains[d] === undefined){
                stdin.console('log', d + ' isdomain: ' + realdomains[d]);
            }else{
                stdin.console('log', d + ' isdomain: unknown');
            }
        }
    }else{
        var c = 0; // eslint-disable-line one-var
        for(i in realdomains){
            realdomains[i] && c++;
        }
        stdin.console('log', 'Cached domain dns: ' + c);
    }
}, 'Displays cached domain information')
    .add('dnsdump', function(){
        stdin.console('log', getrd());
    }, 'dumps the dns cache');
