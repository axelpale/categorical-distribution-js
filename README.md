# categorical-distribution.js<sup>v1.0.0</sup>

Categorical distribution. Compatible with browsers and Node.js.

![Categorical distribution](../master/doc/categorical-distribution-logo-220.png?raw=true)

## Basic example

    > var d = CategoricalDistribution.create();

## Install

Node.js: `npm install categorical-distribution` and `var CategoricalDistribution = require('categorical-distribution');`

Browsers: download and `<script src="categorical-distribution.js"></script>`

## API

### CategoricalDistribution.create()

    > var d = CategoricalDistribution.create();


### d.dump()

    > d.dump();

Exports the state of the distribution for example to be stored to database. See [_d.load()_](#dload).

### d.load()

    > d.load(...);
    undefined

Resets the distribution back to the dumped state. See [_d.dump()_](#ddump).


## Customize CategoricalDistribution

Customize CategoricalDistribution instance by:

    CategoricalDistribution.extension.myFunction = function (...) {...};

After that you can:

    var d = CategoricalDistribution.create();
    d.myFunction();

## Under the hood



## History

The development of categorical-distribution.js started in 2013 as a part of experimental Objectron module and separated to its own module in early 2014. Objectron module is related to such concepts as n-gram, bayesian networks and Markov models especially from a point of view of intelligent user interfaces.

## License

[MIT License](../blob/master/LICENSE)
