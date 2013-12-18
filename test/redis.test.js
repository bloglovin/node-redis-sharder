var assert = require('assert');
var sinon  = require('sinon');

var config = {
  servers: [
    {host: '127.0.0.1', port: 6379, weight: 100},
    {host: '127.0.0.1', port: 6379, weight: 100}
  ],
  options: {}
};
var redis_obj  = require('./../index.js');
var redis = redis_obj(config);


suite('Redis tests', function () {
  test('get total weight', function (done) {
    var weight = redis._getTotalWeight(config.servers);

    assert.equal(weight, 200);
    done();
  });

  test('connection error handler, custom', function (done) {
    var redis_tmp = redis_obj({
      servers: [
        {host: '127.0.0.1', port: 6, weight: 100}
      ],
      error_handler: function (err, server) {
        assert.equal(err.message, 'Redis connection to 127.0.0.1:6 failed - connect ECONNREFUSED');
        assert.deepEqual(server, {host: '127.0.0.1', port: 6, weight: 100});
        done();
      }
    });
  });

  test('connection error handler, default', function (done) {
    var redis_tmp = redis_obj({
      servers: [
        {host: '127.0.0.1', port: 6, weight: 100}
      ]
    });

    done();
  });

  test('no config', function (done) {
    var redis_tmp = redis_obj();
    done();
  });

  test('hset, hget, del', function (done) {
    var key = 'tmp_test_key::noexists';
    var field = 'field1';
    var value = 'value1';

    redis.hset([key, field, value], function (err, result) {
      assert.equal(result, 1);

      redis.hget([key, field], function (err, result) {
        assert.equal(result, value);

        redis.del(key, function (err, result) {
          assert.equal(result, 1);
          done();
        });
      });
    });
  });

  test('sharding', function (done) {
    var keys = [
      ['tmp_test_key::noexists', 0],
      ['dfhbdahfbdafjdnbsfjdsfndsjfdsjf', 1],
      ['I-have-a-dream', 0],
      ['That all men will eat pizza tonight', 0],
      ['und ich bin ein berliner', 0],
      ['aber ist das wirklifdfdj sfjdsbfhdbfhd fdjfbdhsf d', 0],
      ['1', 1]
    ];

    var key = null;

    for (var i in keys) {
      key = redis.hashKey(keys[i][0]);
      assert.equal(keys[i][1], key);
    }

    done();
  });
});
