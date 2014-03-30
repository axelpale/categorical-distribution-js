# categorical-distribution.js<sup>v1.0.0</sup>

CategoricalDistribution models a categorical distribution of a sequence of events. In another words it learns how probable is a thing in a set of things. For example imagine a jar of marbles in many colors. You pick a marble from the jar and _teach_ the color of the marble to the CategoricalDistribution. Now you can use the distribution to predict the color of the next pick and also predict how probable it is. The more you teach the distribution, the more accurate the predictions become.

An _event_ is represented by the name of its category. For example a event of a marble being blue belongs to the category 'blue'. Therefore when we refer to this event by writing the string 'blue'.

Create a new distribution by `var d = CategoricalDistribution.create()`. Teach events to it by `d.learn(['red', 'green', 'red', 'blue'])`. This produces the distribution in the image below.

![Example distribution](../master/doc/example-distribution-180.png?raw=true)

After this you can find the probabilities of events by `d.prob(['red', 'blue', 'yellow'])`, returning an array `[0.5, 0.25, 0]`. The most probable events can be found by `d.head(2)`, returning `['red', 'blue']`, or by `d.peak(0.2)`, returning only `['red']` because probability of 'blue' is over 20 % smaller than 'red'. Positions of events in the list of the most probable events can be found by `d.rank(['red', 'green', 'yellow'])`, returning `[0, 2, Infinity]`.

To replay the learned distribution, samples can be taken by `d.sample(4)`, returning an array similar to `['blue', 'red', 'red', 'green']`. The distribution can also be copied by `d.copy()` or cut by `d.subset(['blue', 'green'])` to allow further modifications without altering the original one.

To store or send the distribution, it can be serialized to an array by `d.dump()` and read back by `d.load(dumpedArray)`.

Compatible with browsers and Node.js.


## Basic example

    > var d = CategoricalDistribution.create()
    > d.learn(['like', 'like', 'dislike', 'like'])
    > d.prob(['like'])
    [0.75]
    > d.sample(3)
    ['dislike', 'like', 'like']

## Install

(not yet working) Node.js: `npm install categorical-distribution` and `var CategoricalDistribution = require('categorical-distribution');`

Browsers: download and `<script src="categorical-distribution.js"></script>`

## API

### CategoricalDistribution.create(size?)

    > var d = CategoricalDistribution.create()

To base probabilities on approximately 20 previous events
    > var e = CategoricalDistribution.create(20)

### d.learn(events)

### d.unlearn(events)

### d.prob(events)

### d.head(n)

### d.peak(deviationTolerance)

### d.rank(events)

Index of the events in the list of most probable events. Most probable event has the rank 0.

### d.sample(n, isOrdered?)

### d.size()

### d.numCategories()

Number of different events in the distribution. If maxSize is set then some of the taught categories may have been forgotten.

### d.maxSize(newMaxSize?)

### d.copy()

### d.subset(categories)

### d.dump()

    > d.dump()

Exports the state of the distribution for example to be stored to database. See [_d.load()_](#dload).

### d.load()

    > d.load(...)
    undefined

Resets the distribution back to the dumped state. See [_d.dump()_](#ddump).


## Customize CategoricalDistribution

(not yet working)

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
