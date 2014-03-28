# categorical-distribution.js<sup>v1.0.0</sup>

CategoricalDistribution models a categorical distribution of a sequence of events. Events are represented by the names of their categories. For example an event of being blue could belong to the category 'blue'.

![Categorical distribution](../master/doc/categorical-distribution-logo-220.png?raw=true)

Events are taught by `.learn(['red', 'blue', 'red'])` and then their probabilities can be found by `.prob(['blue', 'yellow'])`, now returning an array `[0.33, 0]`.

The most probable events can be found by `.head(2)`, returning `['red', 'blue']`, or by `.peak(0.2)`, returning only `['red']` because probability of 'blue' is over 20 % smaller than 'red'. Positions of events in the list of the most probable events can be found by `.rank(['red', 'yellow'])`, returning `[0, Infinity]`.

To replay the learned distribution, samples can be taken by `.sample(4)`, returning an array similar to `['blue', 'red', 'red', 'red']`. The distribution can also be copied by `.copy()` or cut by `.subset(['blue'])` to allow further modifications without altering the original one.

To store or send the distribution, it can be serialized to an array by `.dump()` and read back by `.load(dumpedArray)`.

Compatible with browsers and Node.js.


## Basic example

    > var d = CategoricalDistribution.create();

## Install

Node.js: `npm install categorical-distribution` and `var CategoricalDistribution = require('categorical-distribution');`

Browsers: download and `<script src="categorical-distribution.js"></script>`

## API

### CategoricalDistribution.create(size?)

    > var d = CategoricalDistribution.create();

To base probabilities on approximately 20 previous events
    > var e = CategoricalDistribution.create(20);

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
