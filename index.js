//
// ## Simple redis wrapper
//
// wrapper for node-redis lib with hiredis
//
// * **config** object
//
// **Config object:**
// {
//   servers: [{host: 127.0.0.1, port: 6379, weight: 100}, ...],
//   options: Server options for redis lib,
//   onConnectionError: function (err, server)
// }
//

var redis_cli    = require('redis');
var crc32        = require('buffer-crc32');
var EventEmitter = require('events').EventEmitter;
var inherit      = require('util').inherits;

var Redis = function (config) {
  if (typeof(config) !== 'object') {
    config = {};
  }

  EventEmitter.call(this);

  this.servers = config.servers || [{host: '127.0.0.1', port: 6379, weight: 1}];
  this.options = config.options || {};

  if (typeof(config.error_handler) === 'function') {
    this.onConnectionError = config.error_handler;
  } else {
    this.onConnectionError = function (err, server) {};
  }

  this.total_weight = this._getTotalWeight(this.servers);
  this.connections = this.connect(this.servers, this.options);
};

inherit(Redis, EventEmitter);

//
// ## Connect
// Open up connections to all servers
//
// * **servers** array of servers
// * **options** redis cli server options
//
// **Servers array**, [{host: 127.0.0.1, port: 6379, weight: 100}, ...]
//
Redis.prototype.connect = function (servers, options) {
  var self = this;
  var connections = [];
  var connected = 0;

  servers.map(function (server) {
    var connection = self._openConnection(server, options);
    connections.push(connection);
    return connection;
  }).map(function (connection) {
    connection.on('ready', function () {
      connected++;
      if (connected === connections.length) {
        self.emit('ready');
      }
    });
  });

  return connections;
};

//
// ## Hash key
//
// Hashes the key and returns the correct server.
//
// * **key** the storage key
//
// **Returns** a memcached connection object.
//
Redis.prototype.hashKey = function hashKey(key) {
  var checksum = crc32.unsigned(key);
  var index    = checksum % this.total_weight;

  for (var i in this.servers) {
    var server = this.servers[i];

    if (index < server.weight) {
      return i;
    } else {
      index -= server.weight;
    }
  }
};

//
// Helper to open a connection
// Mostly for easier mocking
//
// * **server** object {host: 127.0.0.1, port: 6379, weight: 100}
//
Redis.prototype._openConnection = function (server, options) {
  var self = this;
  var con = redis_cli.createClient(
    server.port,
    server.host,
    options
  );

  con.on('error', function (err) {
    self.onConnectionError(err, server);
  });

  return con;
};

Redis.prototype._getTotalWeight = function (servers) {
  return servers.reduce(function (r, i) {
    return r + i.weight;
  }, 0);
};

//
// ## Simulate the redis module's API
//
// Dynamically create prototype methods for the redis module API.
//
// Listed below are all the methods I could find that seemed safe to
// shard.
//
var methods = ['del','dump','exists','expire','expireat','get','getset',
               'persist','pexpire','pttl','rename','renamenx','restore',
               'sort','ttl','type','incr', 'incrby','incrbyfloat','psetex','set',
               'setbit','setex','setnx','setrange','strlen','hdel','hexists',
               'hget','hgetall','hincrby','hincrbyfloat','hkeys','hlen','hset',
               'hvals','hmset','hmget','hscan','lindex','linsert','llen','lpop','lpush',
               'lpushx','lrange','lrem','lset','ltrim','rpop','rpush','rpushx',
               'sadd','scard','sismember','smembers','spop','srandmember',
               'srem','sscan','zadd','zcard','zcount','zincrby','zrange',
               'zrangebyscore','zrank','zrem','zremrangebyrank',
               'zremrangebyscore','zrevrange','zrevrangebyscore','zrevrank',
               'zscore','zscan'];

methods.map(function (method) {
  Redis.prototype[method] = function (method) {
    return function () {
      var key = arguments[0];

      if (typeof(key) === 'object') {
        key = key[0];
      }

      var con_key = this.hashKey(key);
      var server  = this.connections[con_key];
      server[method].apply(server, arguments);
    };
  }(method);
});

module.exports = function (config) {
  return new Redis(config);
};

