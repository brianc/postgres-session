//requires npm and should installed
var timeout = 2000;
var Assertion = require('should').Assertion
var http = require('http');
var connect = require('connect');
var pg = require('pg');
var sys = require('sys');
var Store = require('connect/middleware/session/store');
var connectionString = (process.argv[2]||"").replace("--con=","")
var tableName = "test_connect_session";

var log = function() {};

var PostgresStore = require(__dirname + '/../lib');

var log = function() {
  console.log.apply(console, arguments);
}

assert = require('assert');

Assertion.prototype.called = function(timeout) {
  timeout = timeout || 2000;
  var called = false;
  var fun = this.obj;
  var dieId = setTimeout(function() {
    throw new Error(fun + " was not called within " + timeout + " miliseconds");
  }, timeout)
  return function() {
    clearTimeout(dieId);
    fun.apply(this, arguments);
  }
}

Assertion.prototype.call = function(timeout, method) {
  if(typeof timeout == 'function') {
    method = timeout;
    timeout = 2000;
  }
  return method.should.be.called(timeout)
}

assert.isNull = function(obj) {
  assert.ok(obj === null, "Should be null")
}

test = function(name, method) {
  process.stdout.write(method()===false ? "?" : ".")
}

process.on('uncaughtException', function(err) {
  console.error("\n %s", err.stack || err.toString())
  //causes xargs to abort right away
  process.exit(255);
});

process.on('exit', function() {
  console.log();
});


var Sink = function(expected, timeout, callback) {
  var defaultTimeout = 1000;
  if(typeof timeout == 'function') {
    callback = timeout;
    timeout = defaultTimeout;
  }
  timeout = timeout || defaultTimeout;
  var internalCount = 0;
  var kill = function() {
    assert.ok(false, "Did not reach expected " + expected + " with an idle timeout of " + timeout);
  }
  var killTimeout = setTimeout(kill, timeout);
  return {
    add: function(count) {
      count = count || 1;
      internalCount += count;
      clearTimeout(killTimeout)
      if(internalCount < expected) {
        killTimeout = setTimeout(kill, timeout)
      }
      else {
        assert.equal(internalCount, expected);
        callback();
      }
    }
  }
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

var store = new PostgresStore({connectionString: connectionString});

var testServer = connect.createServer(
  connect.cookieDecoder(),
  connect.session({ store: store}),
  function(req, res) {
    res.writeHead(200, {"Content-Type": "text/html"});
    if(req.url == "/") {
      res.end("hello")
    }
    else {
      req.session.hits = (req.session.hits || 0)+1
      res.end(req.session.hits + " hits")
    }
    console.log("closing server");
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
    request.on('response', function(response) {
      response.body = "";
      response.on('data', function(data) {
        response.body += data
      });
      response.on('end', function() {

        var cookieHeaders = response.headers["set-cookie"][0];
        var cookie = cookieHeaders.split(';')[0];
        response.cookie = cookie;
        callback(response);
      });
    });
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

test.get = get;
test.post = post;
test.setup = testSetup;

module.exports = {
  Sink: Sink,
  pg: pg
}
