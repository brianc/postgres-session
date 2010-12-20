var sys = require('sys')
var Store = require('connect/middleware/session/store');
var pg = require('pg');

var tableName = "test_connect_session";

var PostgresStore = function(options) {
  this.connectionString = options.connectionString;
  var options = options || {};
  Store.call(this, options)
}

sys.inherits(PostgresStore, Store)
var p = PostgresStore.prototype;

p.get = function(hash, callback) {
  pg.connect(this.connectionString, function(err, client) {
    if(err) {
      return callback(err);
    }
    client.query("SELECT data FROM " + tableName + " WHERE key = $1", [hash], function(err, result) {
      if(!err) {
        var item = JSON.parse(result.rows[0].data||"{}");
      }
      return callback(err, item)
    })
  })
}

p.set = function(hash, data, callback) {
  pg.connect(this.connectionString, function(err, client) {
    if(err) {
      return callback(err);
    }
    client.query("INSERT INTO " + tableName +"(key, data) VALUES($1, $2)",[hash, JSON.stringify(data)], callback)
  })
}

module.exports = PostgresStore;
