var helper = require(__dirname + "/test-helper");

var sink = new helper.Sink(1, function() {
  helper.pg.end();
});

test.setup(function() {
  test('not using the session', function() {
    test.get('/', function(response) {
      response.body.should.equal("hello");
      sink.add();
    })
  })
})


