node-redis-sharder
==================

A simple sharder for redis, built upon the node-redis library


## Usage
**Example**
```javascript
var config = {
  servers: [
    {host: '127.0.0.1', port: 6379, weight: 100},
    {host: '127.0.0.1', port: 6379, weight: 100}
  ],
  options: {},
  error_handler: function (err, server) {
  	// Handle connection errors
  }
};
var redis = require('./../index.js')(config);

redis.hset([KEY, FIELD, VALUE], function (err, result) {
	// Use result
});
```

## Test

`redis-server`
`npm install`
`npm test`

## License
MIT