# categorical-distribution.js<sup>v6.2.0</sup>

Compatible with browsers and Node.js.


## Example applications

- [Venn Circles](https://rawgithub.com/axelpale/categorical-distribution-js/master/examples/venn-circles/index.html)
- [Self-Organizing List](https://rawgithub.com/axelpale/categorical-distribution-js/master/examples/self-organizing-list/index.html)
- [Markov Balls](https://rawgithub.com/axelpale/categorical-distribution-js/master/examples/markov-balls/index.html)


## Introduction

CategoricalDistribution models a categorical probability distribution. In another words it learns how probable a thing is in a set of things.

For example imagine a jar filled with unknown number of colored marbles. You sample (i.e. pick) a handful of marbles from the jar and _teach_ their colors to the CategoricalDistribution. Now you can use the distribution to predict the color of the next sample and how probable it is. The more samples you teach, the more accurate the predictions become.

Every sample belongs to a category. For example blue marble belongs to the category 'blue'. Therefore when we represent the sample by the string 'blue'.


## Usage

Create a new distribution by `var d = CategoricalDistribution.create()`. Teach samples to it by `d.learn(['red', 'green', 'red', 'blue'])`. This produces the distribution in the image below.

![Example distribution](../master/doc/example-distribution-180.png?raw=true)

After this you can find the probabilities of categories by `d.prob(['red', 'blue', 'yellow'])`, returning an array `[0.5, 0.25, 0]`. The most probable ones can be found by `d.mode(2)`, returning `['red', 'blue']`. Their probability placing can be found by `d.rank(['red', 'green', 'yellow'])`, returning `[0, 2, Infinity]` i.e. 'red' is the most probable, 'green' is the third and 'yellow' has no placing because there hasn't been any 'yellow' samples.

To replay the learned distribution, samples can be taken by `d.sample(4)`, returning an array similar to `['blue', 'red', 'red', 'green']`. The distribution can also be copied by `d.copy()` or cut by `d.subset(['blue', 'green'])` to allow further modifications without altering the original one.

To store or load the distribution, it can be serialized into an array by `d.dump()` and read back by `d.load(dumpedArray)`.


## Basic example

    >> var d = CategoricalDistribution.create()
    >> d.learn(['like', 'like', 'dislike', 'like'])
    >> d.prob(['like'])
    [0.75]
    >> d.sample(3)
    ['dislike', 'like', 'like']


## Install

(not yet working) Node.js: `npm install categorical-distribution` and `var CategoricalDistribution = require('categorical-distribution');`

Browsers: download and `<script src="categorical-distribution.js"></script>`



## API


### CategoricalDistribution.create()

Construct a new CategoricalDistribution instance.

    >> var d = CategoricalDistribution.create()


### d.learn(samples, [weight=1])

Learn these samples. [Chainable](#chaining).

    >> var d = CategoricalDistribution.create()
    >> d.learn(['red', 'blue', 'red', 'green'])
    >> d.prob(['red', 'green', 'blue'])
    [0.5, 0.25, 0.25]

If there is only one event, array is optional:

    >> d.learn('red')

The optional _weight_ parameter can be given to add custom amount of weight to the category. Default weight is 1.

    >> var cd = CategoricalDistribution.create()
    >> cd.learn('red', 2)
    >> cd.learn('green')
    >> cd.prob('green')
    0.33...

See [Under the hood](#under-the-hood) for details.

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


### d.unlearn(samples, [weight=1])

Forget the these samples. Do not forget the whole category, only the samples. Inverse of [d.learn](#dlearneventsweight1). [Chainable](#chaining).

    // red 2, blue 1, green 1
    >> d.unlearn(['red', 'blue'])
    >> d.prob(['red', 'green', 'blue'])
    [0.5, 0.5, 0]

If there is only one event, array is optional:

    >> d.unlearn('red')


### d.prob([categories])

Probabilities of the categories. If parameter is omitted return probabilities of all categories in their probability order.

    // red 2, blue 1, green 1
    >> d.prob(['red', 'green'])
    [0.5, 0.25]
    >> d.prob()
    [0.5, 0.25, 0.25]

If given only one category, array is optional:

    >> d.prob('red')
    0.5


### d.mode([n])
_Alias d.head([n])_

Return n most probable categories ordered by their probability. If n is omitted or large, return all the categories.

    // red 2, blue 1, green 1
    >> d.mode()
    ['red', 'green', 'blue']
    >> d.mode(1000)
    ['red', 'green', 'blue']
    >> d.mode(1)
    ['red']
    >> d.mode(0)
    []


### d.peak(tolerance)

List the most probable category and the categories whose probability differs from it at most by tolerance * 100 percent. Tolerance 1 will list all the categories. The list is ordered by probability.

    // red 5, blue 3, green 2
    >> d.prob(['red', 'blue', 'green'])
    [0.5, 0.3, 0.2]
    >> d.peak(0)
    ['red']
    >> d.peak(0.3)  // >= 0.5 - 0.3*0.5 = 0.35
    ['red']
    >> d.peak(0.5)  // >= 0.5 - 0.5*0.5 = 0.25
    ['red', 'blue']
    >> d.peak(0.6)  // >= 0.5 - 0.6*0.5 = 0.20
    ['red', 'blue', 'green']


### d.rank(categories)

Indices of the categories in the list of the categories ordered by their probability. Most probable category has the rank 0. If two categories have same probability the more recent one will have a ranking closer to rank 0. Yet unknown categories have rank Infinity.

    // red 2, blue 1, green 1
    >> d.rank(['red', 'blue', 'yellow'])
    [0, 2, Infinity]

If given only one category, array is optional:

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

Number of categories in the distribution.

    // red 2, blue 1, green 1
    >> d.numCategories()
    3


### d.copy()

Duplicate the distribution. Modifications to the duplicate do not alter the original.

    // d: red 2, blue 1, green 1
    >> var c = d.copy()
    >> c.learn(['blue', 'blue'])
    >> d.mode()
    ['red', 'green', 'blue']
    >> c.mode()
    ['blue', 'red', 'green']


### d.subset(categories)

Copy the distribution so that only the given categories are left in the copy. The probabilities of the categories may change but the ratios between them stay the same.

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

Serialize the state of the distribution to an array, for example to be stored to a database. See [_d.load()_](#dload).

    >> var d = CategoricalDistribution.create()
    >> d.learn(['red', 'red', 'blue', 'green']);
    >> d.dump()
    ["red", 2, "green", 1, "blue", 1]


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

Without the parameter a probability distribution is retuned, i.e. the weights are normalized to sum up to 1.

If distribution parameter is given then the method is [chainable](#chaining). The given distribution does not have to be normalized.


### d.print([precision=2])

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

Most of the functions that do not return anything special, or return a new CategoricalDistribution, are chainable.

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

Each category has a weight that is a number that represents the number of samples from the category. The probability of the category equals to its weight divided by the sum of all the weights. The sum is kept in its own variable and therefore the need to recalculate the sum is avoided.


## History

The development of categorical-distribution.js started in 2013 as a part of experimental Objectron module and separated to its own module in early 2014. Objectron module is related to such concepts as n-gram, bayesian networks and Markov models especially from a point of view of intelligent user interfaces.


## TODO

- browser compability tests
- test subset and others with duplicate categories
- reorder methods
- Under the hood & rewrite source header comments.
- Release to NPM
- Nice categorical distribution example image
- Absolute peak
- See also:
  - https://github.com/jergason/categorical
  - http://jamisondance.com/10-15-2012/categorical-distribution-in-javascript/

## Versioning

[Semantic Versioning 2.0.0](http://semver.org/)

## License

[MIT License](../blob/master/LICENSE)
