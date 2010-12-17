require(__dirname+"/test-helper");

var http = require('http');
var connect = require('connect');
var pg = require('pg');
var sys = require('sys');
var Store = require('connect/middleware/session/store');
var connectionString = process.argv[2].replace("--con=","");
var tableName = "test_connect_session";

var testSetup = function(callback) {
  pg.defaults.poolSize = 1;
  console.log('connecting to %s', connectionString);
  pg.connect(connectionString, should.call(function(err, client) {
    console.log("connected");
    assert.isNull(err)
    console.log("no connect error");
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
  console.log("called get");
  pg.connect(this.connectionString, function(err, client) {
    if(err) {
      return callback(err);
    }
    client.query("SELECT data FROM" + tablename + "WHERE key = $1", [hash], function(err, result) {
      console.log("recieved result %j", result);
      var item = JSON.parse(result.rows[0].data||"{}");
      console.log(item);
      return callback(err, item)
    })
  })
}

p.set = function(hash, data, callback) {
  console.log("setting %s %j", hash, data)
  pg.connect(this.connectionString, function(err, client) {
    console.log("Connected");
    if(err) {
      console.log("Error");
      return callback(err);
    }
    client.query("INSERT INTO " + tableName +"(key, data) VALUES($1, $2)",[hash, JSON.stringify(data)], callback)
  })
}
var store = new PostgresStore({connectionString: connectionString});


var startTestServer = function(callback) {
  var server = connect.createServer(
    connect.cookieDecoder(),
    connect.session({ store: store}),
    function(req, res) {
      res.writeHead(200, {"Content-Type": "text/html"});
      res.end("BOOM")
      server.close();
    }
  );
  server.listen(8081, callback)
}

var request = should.call(function(method, url, callback) {
  startTestServer(function() {
    var testClient = http.createClient(8081, 'localhost');
    var request = testClient.request(method, url);
    request.end();
    request.on('response', should.call(callback))
  })
})

var get = function(url, callback) {
  test('getting ' + url, should.call(function() {
    request('GET', url, callback)
  }))
}

var post = function(url, callback) {
  test('posting to ' + url, function() {
    request('POST', url, callback)
  })
}


testSetup(function() {
  console.log("starting tests")
  get('/', function(response) {
    console.log("Response was called");
    response.statusCode.should.equal(200)
    pg.end();
  })
});

