const servers = [];
module.exports = new Proxy(servers, {
    get: (target, property, reciever) => servers[property],
    set: (target, property, value, receiver) => {
        if(property === 'length'){
            return true;
        }
        if(isNaN(property)){
            return false;
        }
        target[property] = value;
        return target[property] === value;
    },
    has: (target, prop) => prop in servers
});
