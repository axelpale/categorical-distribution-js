/*

Benchmarking sampling algorithms

Results
  1. number of samples does not affect to which one is faster
  2. number of categories does affect. It seems that when there are
     22 or more categories than 

*/
var CategoricalDistribution = require('../categorical-distribution');

// Distribution, 26 categories
var d = CategoricalDistribution.create();
d.learn(['a', 'a', 'b', 'c', 'd', 'e', 'f', 'g',
              'h', 'i', 'j', 'k', 'l', 'm', 'n',
              'o', 'p', 'q', 'r', 's', 't', 'u',
              'v', 'w', 'x', 'y', 'z']);

// Number of samples
var n = 10000;

module.exports = {
  name: 'sample() algorithm test',
  tests: {
    'sample unordered': function () {
      d.sample(n, false);
    },
    'sample ordered': function () {
      d.sample(n, true);
    }
  }
};