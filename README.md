# categorical-distribution.js<sup>v6.0.0</sup>

CategoricalDistribution models a categorical distribution of a sequence of events. In another words it learns how probable is a thing in a set of things. For example imagine a jar of marbles in many colors. You pick a marble from the jar and _teach_ the color of the marble to the CategoricalDistribution. Now you can use the distribution to predict the color of the next pick and also predict how probable it is. The more you teach the distribution, the more accurate the predictions become.

An _event_ is represented by the name of its category. For example a event of a marble being blue belongs to the category 'blue'. Therefore when we refer to this event by writing the string 'blue'.

Create a new distribution by `var d = CategoricalDistribution.create()`. Teach events to it by `d.learn(['red', 'green', 'red', 'blue'])`. This produces the distribution in the image below.

![Example distribution](../master/doc/example-distribution-180.png?raw=true)

After this you can find the probabilities of events by `d.prob(['red', 'blue', 'yellow'])`, returning an array `[0.5, 0.25, 0]`. The most probable events can be found by `d.head(2)`, returning `['red', 'blue']`, or by `d.peak(0.2)`, returning only `['red']` because probability of 'blue' is over 20 % smaller than 'red'. Positions of events in the list of the most probable events can be found by `d.rank(['red', 'green', 'yellow'])`, returning `[0, 2, Infinity]`.

To replay the learned distribution, samples can be taken by `d.sample(4)`, returning an array similar to `['blue', 'red', 'red', 'green']`. The distribution can also be copied by `d.copy()` or cut by `d.subset(['blue', 'green'])` to allow further modifications without altering the original one.

To store or send the distribution, it can be serialized to an array by `d.dump()` and read back by `d.load(dumpedArray)`.

Compatible with browsers and Node.js.


## Basic example

    >> var d = CategoricalDistribution.create()
    >> d.learn(['like', 'like', 'dislike', 'like'])
    >> d.prob(['like'])
    [0.75]
    >> d.sample(3)
    ['dislike', 'like', 'like']


## Example applications

- [Venn Circles](https://rawgithub.com/axelpale/categorical-distribution-js/master/examples/venn-circles/index.html)
- [Self-Organizing List](https://rawgithub.com/axelpale/categorical-distribution-js/master/examples/self-organizing-list/index.html)
- [Markov Balls](https://rawgithub.com/axelpale/categorical-distribution-js/master/examples/markov-balls/index.html)


## Install

(not yet working) Node.js: `npm install categorical-distribution` and `var CategoricalDistribution = require('categorical-distribution');`

Browsers: download and `<script src="categorical-distribution.js"></script>`



## API


### CategoricalDistribution.create([learningRate])

    >> var d = CategoricalDistribution.create()

By default each event has equal weight in the distribution. Set the learning rate greater than 1 (1 is default) for adapting distribution. Learning rate 1.5 makes new event 1.5 times more important than the previous. In another words the effect of the previous events dimishes to 1/1.5. See [Under the hood](#under-the-hood) for details.

    >> var e = CategoricalDistribution.create(1.5)


### d.learn(events)

Learn the distribution from these events. [Chainable](#chaining).

    >> var d = CategoricalDistribution.create()
    >> d.learn(['red', 'blue', 'red', 'green'])
    >> d.prob(['red', 'green', 'blue'])
    [0.5, 0.25, 0.25]

If there is only one event, array is optional:

    >> d.learn('red')


The order of the events matters only if the learning rate is not 1 (the default). See [Under the hood](#under-the-hood) for details.

The following three blocks produce equal results

```
>> d.learn(['red', 'blue', 'red', 'green'])
```
```
>> d.learn(['red', 'blue'])
>> d.learn(['red', 'green'])
```
```
>> d.learn(['red', 'blue']).learn(['red']).learn('green')
```


### d.unlearn(events)

Forget that these events happened. Do not forget the whole category, only single events. Inverse of [d.learn](#dlearnevents). [Chainable](#chaining).

    // red 2, blue 1, green 1
    >> d.unlearn(['red', 'blue'])
    >> d.prob(['red', 'green', 'blue'])
    [0.5, 0.5, 0]

If there is only one event, array is optional:

    >> d.unlearn('red')


### d.prob([events])

Probabilities of events. If parameter is omitted return probabilities of all events in the probability order. 

    // red 2, blue 1, green 1
    >> d.prob(['red', 'green'])
    [0.5, 0.25]
    >> d.prob()
    [0.5, 0.25, 0.25]

If there is only one event, array is optional:

    >> d.prob('red')
    0.5


### d.head([n])

Return n most probable categories ordered by their probability. If n is omitted or zero, return all the categories.

    // red 2, blue 1, green 1
    >> d.head()
    ['red', 'green', 'blue']
    >> d.head(0)
    ['red', 'green', 'blue']
    >> d.head(1)
    ['red']


### d.peak(tolerance)

List the most probable category and the categories whose probability differs from it at most by tolerance * 100 percent. Tolerance 1 will list all the categories. The list is ordered by probability.

    // red 5, blue 3, green 2
    >> d.prob(['red', 'blue', 'green'])
    [0.5, 0.3, 0.2]
    >> d.peak(0)
    ['red']
    >> d.peak(0.3)
    ['red']
    >> d.peak(0.5)
    ['red', 'blue']
    >> d.peak(0.6)
    ['red', 'blue', 'green']


### d.rank(events)

Indices of the events in the list of most probable events. Most probable event has the rank 0. If two events have same probability the more recent one will have a ranking closer to the top. Yet unknown events have rank Infinity.

    // red 2, blue 1, green 1
    >> d.rank(['red', 'blue', 'yellow'])
    [0, 2, Infinity]

If there is only one event, array is optional:

    >> d.rank('blue')
    2


### d.each(iterator, [context])

Call an iterator function once for each category in their probability order. [Chainable](#chaining).

    // red 2, blue 1, green 1
    >> var probs = {};
    >> d.each(function (category, probability, rank) {
         probs[category] = probability;
       });
    >> probs
    {
      blue: 0.25,
      green: 0.25,
      red: 0.5
    }


### d.map(iterator, [context])

Call an iterator function once for each category in their probability order. Return an array of the values returned by the iterator.

    // red 2, blue 1, green 1
    >> d.map(function (category, probability, rank) {
         return category;
       });
    ['red', 'blue', 'green']


### d.sample(n, [isOrdered])

Draw n samples randomly from the distribution. If isOrdered is true (false if omitted) the results are ordered most probable samples first. This ordering is done without any additional computational penalty. See the source for details.

    // red 2, blue 1, green 1
    >> d.sample(3)
    ['blue', 'red', 'red']
    >> d.sample(3, true)
    ['red', 'red', 'green']
    >> d.sample(1)
    ['green']
    >> d.sample(0)
    []


### d.numCategories()

Number of different events in the distribution.

    // red 2, blue 1, green 1
    >> d.numCategories()
    3


### d.learningRate([newLearningRate])

Get or set how important is an event in relation to the previous ones. With learning rate zero the new events do not have any effect. Learning rate Infinity makes the distribution to be based only on the last event. See [Under the hood](#under-the-hood) for detail.

```
>> var d = CategoricalDistribution.create()
>> d.learningRate()
1
```
```
>> var c = CategoricalDistribution.create(1.5)
>> c.learningRate()
1.5
>> c.learningRate(Infinity)
>> c.learningRate()
Infinity
```


### d.copy()

Duplicate the distribution. Modifications to the duplicate do not alter the original.

    // red 2, blue 1, green 1
    >> var c = d.copy()
    >> c.learn(['blue', 'blue'])
    >> d.head()
    ['red', 'green', 'blue']
    >> c.head()
    ['blue', 'red', 'green']


### d.subset(categories)

Copy the distribution so that only the given categories are left in the copy. The probabilities of the categories may change but the ratios between them stay the same. Learning rate stays the same.

    // red 2, blue 1, green 1
    >> var c = d.subset(['red', 'blue'])
    >> d.print()
    red   0.50
    green 0.25
    blue  0.25
    >> c.print()
    red  0.67
    blue 0.33


### d.dump()

Serialize the state of the distribution to an array for example to be stored to database. See [_d.load()_](#dload).

    >> var d = CategoricalDistribution.create(1.1)
    >> d.learn(['red', 'red', 'blue', 'green']);
    >> d.dump()
    ["red", 1.57776, "green", 1, "blue", 0.90909, 1.1]


### d.load()

Reset the distribution back to the dumped state. See [_d.dump()_](#ddump). [Chainable](#chaining).

    >> d.load(dumpedArray)


### d.dist([distribution])

Set or get the whole distribution.

    >> var d = CategoricalDistribution.create()
    >> d.dist({
         red: 3,
         blue: 1
       })
    >> d.dist()
    { red: 0.75, blue: 0.25 }

If new distribution is set the method is [chainable](#chaining).


### d.print([precision])

Human readable representation of the distribution. Return a string.
    
    // red 4, blue 1, green 1
    >> d.print()
    "red   0.67
    green 0.17
    blue  0.17
    "
    >> console.log(d.print())
    red   0.67
    green 0.17
    blue  0.17

    >> d.print(4)
    "red   0.6667
    green 0.1667
    blue  0.1667
    "


## Chaining

Most of the functions that do not return anything else are chainable.

    >> var d = CategoricalDistribution.create().learn(['red', 'green', 'blue'])
    >> d.subset(['green', 'blue']).prob()
    [0.5, 0.5]


## Customize

Add your own methods to CategoricalDistribution instance:

    CategoricalDistribution.extension.myFunction = function (...) {...};

After that you can:

    var d = CategoricalDistribution.create();
    d.myFunction();

Great for making plugins.


## Under the hood


## History

The development of categorical-distribution.js started in 2013 as a part of experimental Objectron module and separated to its own module in early 2014. Objectron module is related to such concepts as n-gram, bayesian networks and Markov models especially from a point of view of intelligent user interfaces.


## TODO

- remove difficulties with zero learning rate 
  - unlearn overflow tests
  - learn & unlearn underflow tests
  - significance over importance
- browser compability tests
- test subset and others with duplicate categories
- reorder methods
- Under the hood & rewrite source header comments.
- Release to NPM
- Nice categorical distribution example image
- More lightweight introduction
- Absolute peak
- head(0) -> head(Infinity)
- See also:
  - https://github.com/jergason/categorical
  - http://jamisondance.com/10-15-2012/categorical-distribution-in-javascript/

## Versioning

[Semantic Versioning 2.0.0](http://semver.org/)

## License

[MIT License](../blob/master/LICENSE)
