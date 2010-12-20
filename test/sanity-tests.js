var helper = require(__dirname+"/test-helper");

test.setup(function() {

  test.get('/session', function(response) {
    var sink = new helper.Sink(1, function() {
      helper.pg.end();
    })
    var cookieHeaders = response.headers["set-cookie"][0];
    response.statusCode.should.equal(200)
    response.cookie.should.not.eql(false);
    response.body.should.equal("1 hits");
    sink.add();
  })

});

