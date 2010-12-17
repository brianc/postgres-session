//requires npm and should installed
var timeout = 2000;
var should = require('should').Assertion
assert = require('assert');

should.prototype.called = function(timeout) {
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

should.prototype.call = function(timeout, method) {
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


