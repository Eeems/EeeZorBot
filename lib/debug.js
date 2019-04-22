var log = require('./log.js');
/**
 * Debug functions
 * @module debug
 * @class debug
 * @static
 * @main
 */
module.exports = {
    /**
     * Outputs a debug log ("DEBUG: "+JSON.stringify(message))
     * @method log
     * @param [message]* messages to output
     * @chainable
     */
    log: function(){
        log.debug.apply(log, arguments);
        return this;
    }
};
