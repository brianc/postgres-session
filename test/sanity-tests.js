require(__dirname+"/test-helper");

var http = require('http');
var connect = require('connect');
var pg = require('pg');
var sys = require('sys');
var Store = require('connect/middleware/session/store');
var connectionString = process.argv[2].replace("--con=","");
var tableName = "test_connect_session";

var log = function() {
  console.log.apply(console, arguments);
}

var testSetup = function(callback) {
  pg.defaults.poolSize = 1;
  log('connecting to %s', connectionString);
  pg.connect(connectionString, should.call(function(err, client) {
    log("connected");
    assert.isNull(err)
    client.query('DROP TABLE ' + tableName, function(err) {
      //disregard the error
      client.query("CREATE TABLE " + tableName + " (key varchar(64), data varchar(255))", callback)
    })
  }))
}

var PostgresStore = function(options) {
  this.connectionString = options.connectionString;
  var options = options || {};
  Store.call(this, options)
}

sys.inherits(PostgresStore, Store)
var p = PostgresStore.prototype;

p.get = function(hash, callback) {
  log("called get");
  pg.connect(this.connectionString, function(err, client) {
    if(err) {
      return callback(err);
    }
    client.query("SELECT data FROM " + tableName + " WHERE key = $1", [hash], function(err, result) {
      log("recieved result %j", result);

      if(!err) {
        var item = JSON.parse(result.rows[0].data||"{}");
        log(item);
      }
      return callback(err, item)
    })
  })
}

p.set = function(hash, data, callback) {
  log("setting %s %j", hash, data)
  pg.connect(this.connectionString, function(err, client) {
    log("Connected");
    if(err) {
      log("Error");
      return callback(err);
    }
    client.query("INSERT INTO " + tableName +"(key, data) VALUES($1, $2)",[hash, JSON.stringify(data)], callback)
  })
}
var store = new PostgresStore({connectionString: connectionString});

var testServer = connect.createServer(
  connect.cookieDecoder(),
  connect.session({ store: store}),
  function(req, res) {
    req.session.hits = (req.session.hits || 0)+1
    res.writeHead(200, {"Content-Type": "text/html"});
    res.end(req.session.hits + " hits")
    testServer.close();
  }
)

var startTestServer = function(callback) {
  testServer.listen(8081, callback)
}

var request = should.call(function(method, url, headers, callback) {
  startTestServer(function() {
    var testClient = http.createClient(8081, 'localhost');
    if(typeof headers == 'function') {
      callback = headers;
      headers = {};
    }
    var request = testClient.request(method, url, headers);
    request.end();
    request.on('response', should.call(callback))
  })
})

var get = function(url, headers, callback) {
  test('getting ' + url, should.call(function() {
    request('GET', url, headers, callback)
  }))
}

var post = function(url, headers, callback) {
  test('posting to ' + url, function() {
    request('POST', url, headers, callback)
  })
}


testSetup(function() {
  var headers = {};

  get('/', function(response) {
    headers["cookie"] = response.headers["set-cookie"][0].split(';')[0];
    response.statusCode.should.equal(200)
    pg.end();
  })

});

