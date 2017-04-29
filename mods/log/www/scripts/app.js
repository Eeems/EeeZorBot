/* eslint-env browser */
window.onload = function(){
    NodeList.prototype.forEach = HTMLCollection.prototype.forEach = Array.prototype.forEach;
    document.querySelector('#controls>span.right>a.reload').onclick = function(){
        location.reload();
    };
    if(window.todayDate === window.thisDate){
        var ws = window.socket.create('ws://' + window.socketHost + ':' + window.socketPort),
            tries = 0;
        ws.open(function(e){
            console.log('Connected to websocket');
            ws.send(JSON.stringify({
                type: 'sub',
                channel: window.channel
            }));
        })
            .error(function(e){
                console.log(e);
                if(++tries <= 5){
                    setTimeout(function(){
                        ws.open();
                    }, 1000);
                }
            })
            .close(function(e){
                console.log('Connection closed');
            })
            .message(function(e){
                var d = JSON.parse(e.data);
                console.log('WEBSOCKET - ' + d.type);
                switch(d.type){
                    case'pub':
                        var content = document.getElementById('content'), // eslint-disable-line one-var
                            scroll = content.scrollHeight === content.scrollTop + content.offsetHeight,
                            ll = document.querySelector('#end'),
                            div = document.createElement('div');
                        div.innerHTML = window.template('template-message', d.payload);
                        div.children.forEach(function(child){
                            ll.parentNode.insertBefore(child, ll);
                        });
                        if(scroll){
                            content.scrollTop = content.scrollHeight;
                        }
                        break;
                    case'datechange':
                        ws.close();
                        break;
                    case'message':case'join':case'quit':case'part':
                    case'notice':case'topic':case'mode':case'action':
                        ws.send(JSON.stringify({
                            type: 'get/line',
                            id: d.id
                        }));
                        break;
                    default:
                        console.error('Unimplemented server call ' + d.type);
                        console.error(d);
                }
            })
            .open();
    }
};
