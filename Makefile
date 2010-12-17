SHELL := /bin/bash

con=pg://brian@localhost/postgres

test-unit:
	@find test -name "*-tests.js" | xargs -n 1 -I file node file --con=$(con)

test: test-unit

.PHONY : test
