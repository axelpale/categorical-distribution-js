/*

Adapting Categorical Distribution

Learning rate is a number in range [0, Infinity).
It tells how important is a learned event in relation to the previous one.
Learning rate of 1 keeps the importancy same. Importancy of the previous
events do not drop.
Rate 1.2 means that the importancy of previous events drops by 1/1.2 for each
new event. Rate 0.5 means that importancy of previous events grow, making
changing the distribution hard. Rate 0 means that new events do not affect
to the distribution at all.
Rate of 10 means that new events weight 10 times more than the previous one.
Learning rate is 1 by default.
Learning rate of Infinity means that all the previous events do not mean
anything anymore.


In this distribution every category has its own numeric weight. When
an event belonging to a category is taught to the distribution the weight of
the category is increased by one. The events in the category with the biggest
weight are the most probable ones. Probability of an event is the proportion
of the weight of its category to the sum of all the distribution's weights.

To avoid categories growing limitlessy and allow the distribution to adapt to
change, there must be limits for the number of categories and the number in
weights. Limiting the number of categories affects to the computation time
positively. Limiting the weights speeds up adaptation but decreases noise
resistance and therefore stability.

Let the two dimensions be maxCategorySize and maxNumCategories. These form
a dependent dimension maxSize = maxCategorySize * maxNumCategories. Here
maxSize equals to the maximum number of weights in the distribution.

For this distribution maxSize is selected to be the only input parameter.
Only the sum of the weights is important. Therefore no hard limits are set
for maxCategorySize and maxNumCategories even though they are still limited
by maxSize but in more dynamical manner. For example with maxSize = 8 there
could be two categories with 2 and 6 in their weights or four categories
with 1, 3, 2 and 2.

If the limit is exceeded a forgetting algorithm must be applied. There are
multiple options for such algorithm (n = number of categories):
- Random Pick: decrease a randomly selected weight. O(1)
- Normalized Random Pick: decrease a sampled weight.
- Divide: multiply weights by number smaller than 1 to meet the limit. O(n)
- Subtract: subtract weights by 1 / numCategories. O(n)
- FIFO: First in first out. Decrease the weight of the oldest event. O(n)
- LRU: Decrease the weight of least recently increased (used) category. O(?)
- Round-robin: Each category is decreased in their turns. O(1)

Random algorithm would be nice because implementation easiness and quickness.
Its non-deterministicity makes it harder to test and thats why Random is not
the way to go. Round-robin has similar effect as the Random but is
deterministic. Round-robin loops through the list of categories ordered by
probability and starts from the least probable. A problem of Round-robin is
complex implementation because decreasing affects round order.

Normalized Random is selected because implementation easiness (one-liner!).
Normalized Random decreased a random category. Most probable categories have
largest probability to become decreased. In large scale the algorithm has
a flattening effect to the distribution similar to Divide algorithm. Non-
deterministicity makes Normalized Random hard to test.

Related
- unigram
- http://en.wikipedia.org/wiki/Bag_of_words_model
- http://en.wikipedia.org/wiki/Categorical_distribution

*/

myModule.CategoricalDistribution = (function () {
  var exports = {};
  /////////////////




  // Private methods
  
  var sortOne = function (acd, category) {
    // Move event category to its position in a manner similar to
    // insertion sort.
    // 
    // Precondition
    //   $category is only out of order category in $order.
    //   $category exists in $weights, $indices and in $order.
    var s, i, c, backwards, isLast, isFirst, tempCat;

    s = acd.state;
    i = s.indices[category];
    c = s.weights[category];

    // Recognize direction
    isLast = (i === s.order.length - 1);
    isFirst = (i === 0);
    if (isLast) {
      backwards = true;
    } else if (isFirst) {
      backwards = false;
    } else {
      // assert: at least one before and at least one after.
      if (s.weights[s.order[i - 1]] < c) {
        backwards = true;
      } else {
        backwards = false;
      }
    }

    // Move until category in its place.
    // Place most recent as front as possible.
    if (backwards) {
      while (i !== 0 && s.weights[s.order[i - 1]] <= c) {
        // Swap towards head
        tempCat = s.order[i - 1];
        s.order[i] = tempCat;
        s.order[i - 1] = category;
        s.indices[tempCat] = i;
        i -= 1;
      }
    } else {
      while (i !== s.order.length - 1 && s.weights[s.order[i + 1]] > c) {
        // Swap towards tail
        tempCat = s.order[i + 1];
        s.order[i] = tempCat;
        s.order[i + 1] = category;
        s.indices[tempCat] = i;
        i += 1;
      }
    }

    // Update category index
    s.indices[category] = i;
  };


  var multiplyWeights = function (acd, multiplier) {
    // Multiply weights and update weightsSum

    var s, len, newWeightsSum, ratio, i, cat;
    
    s = acd.state;
    len = s.order.length;

    for (i = 0; i < len; i += 1) {
      cat = s.order[i];
      s.weights[cat] *= multiplier;
    }

    s.weightsSum *= multiplier;
  };


  var sampleSimple = function (acd, n) {
    // Take N samples randomly.
    // Complexity O(n * m) where m is num of categories. This because
    // cumulative distribution function is recalculated for every sample.
    var x, i, j, cumulativeSum,
        result = [],
        s = acd.state;

    if (s.order.length === 0 || n <= 0) {
      return result;
    } // else

    for (i = 0; i < n; i += 1) {
      x = randomFromInterval(0, s.weightsSum);
      cumulativeSum = 0;
      for (j = 0; j < s.order.length; j += 1) {
        // Add to cumulative sum until greater.
        // Because random max is exclusive, weight sum
        // will be greater at the last event at the latest.
        cumulativeSum += s.weights[s.order[j]];
        if (x < cumulativeSum) {
          result.push(s.order[j]);
          break;
        }
      }
    }

    return result;
  };


  var sampleOrdered = function (acd, n) {
    // Take N samples randomly but return them in probability order.
    // Calculates cumulative density function only once.
    // Complexity O(n + m) but has quite large overhead compared to.
    // sampleSimple. Good performance when there is large number of
    // categories (about 30 or more) even if the results need to be
    // shuffled.

    var rands, cat, cumulativeSum, i, r,
        result = [],
        s = acd.state;

    if (s.order.length === 0 || n <= 0) {
      return result; // empty array
    } // else

    rands = randomOrderedSetFromInterval(n, 0, s.weightsSum);

    cat = 0;
    cumulativeSum = s.weights[s.order[cat]];

    for (i = 0; i < n; i += 1) {
      r = rands[i];

      // Use < instead of <= because inclusive head, exclusive tail.
      if (r < cumulativeSum) {
        result.push(s.order[cat]);
      } else {
        do {
          // Add to cumulative sum until it becomes greater than $r.
          // Because the interval tail is exclusive, $cumulativeSum
          // will become greater than $r at least in the end.
          cat += 1;
          cumulativeSum += s.weights[s.order[cat]];
        } while (cumulativeSum <= r);

        result.push(s.order[cat]);
      }
    }

    // Results in probability order.
    return result;
  };






  // Exceptions

  var NotAnArrayException = function () {
    // Usage: new NotAnArrayException();
    this.name = 'NotAnArrayException';
    this.message = 'Parameter is required to be an array';
  };
  
  var InvalidDumpException = function () {
    // Usage: new InvalidDumpException();
    this.name = 'InvalidDumpException';
    this.message = 'Dump cannot be loaded because of invalid syntax.';
  };

  var InvalidDistributionException = function () {
    this.name = 'InvalidDistributionException';
    this.message = 'Distribution is in unknown form.';
  };

  exports.NotAnArrayException = NotAnArrayException;
  exports.InvalidDumpException = InvalidDumpException;
  exports.InvalidDistributionException = InvalidDistributionException;





  // Constructor

  var ACD = function (learningRate) {
    // Parameter
    //   learningRate (optional, default 1)
    //     positive number
    //       0: Learn nothing; new events have no effect.
    //       1: Every event has equal effect regardless of their order
    //       Infinity: only last counts

    this.state = {
      weights: {}, // Weight for each category
      weightsSum: 0, // Sum of $weights
      eventWeight: 1, // Weight of the previous event.
      learningRate: 1, // How important is new event in relation to the prev
      order: [], // Ordered most probable category first.
      indices: {} // Category indices in $order array
    };

    this.learningRate(learningRate);
  };

  exports.create = function (param1) {
    return new ACD(param1);
  };
    





  // Accessors

  ACD.prototype.prob = function (events) {
    // Probabilities of given events
    // 
    // Return array of numbers.

    var result = [],
        i, ev, p,
        s = this.state;

    if (typeof events === 'string') {
      throw new NotAnArrayException();
    } else if (typeof events === 'undefined') {
      events = s.order;
    }

    // Avoid dividing by zero
    if (s.weightsSum === 0) {
      // Array of zeros.
      for (i = 0; i < events.length; i += 1) {
        result.push(0);
      }
      return result;
    } // else
 
    for (i = 0; i < events.length; i += 1) {
      ev = events[i];
      if (s.weights.hasOwnProperty(ev)) {
        p = s.weights[ev] / s.weightsSum;
        result.push(p);
      } else {
        result.push(0);
      }
    }

    return result;
  };


  ACD.prototype.head = function (n) {
    // N most probable event categories
    // 
    // Parameter
    //   n (optional, default 0)
    //     0 to return all categories in probability order.
    // 
    // Return array of event categories

    var s = this.state;
    if (typeof n !== 'number') {
      n = 0;
    }

    n = Math.min(n, s.order.length);
    if (n > 0) {
      return s.order.slice(0, n);
    } // else
    if (n === 0) {
      return s.order.slice(0); // copy
    } // else
    return [];
  };


  ACD.prototype.peak = function (deviationTolerance) {
    // Return most probable category (probability X) and all those categories
    // whose probability differs from X by not more than
    // deviationTolerance * 100 percent.
    //
    // Parameter
    //   deviationTolerance
    //     number in closed interval [0, 1]
    // 
    // Return array of categories

    var i, headLikelihood, minLikelihood,
        s = this.state;

    if (s.order.length === 0) {
      return [];
    } // else len > 0

    headLikelihood = s.weights[s.order[0]];
    minLikelihood = headLikelihood - headLikelihood * deviationTolerance;

    for (i = 1; i < s.order.length; i += 1) {
      if (minLikelihood > s.weights[s.order[i]]) {
        break;
      } // else include i:th category
    }

    // Do not include i:th category.
    return s.order.slice(0,i);
  };


  ACD.prototype.subset = function (categories) {
    // Return new CategoricalDistribution that has only the specified
    // categories. Weights stay the same, so probabilities may change but
    // the ratios between probabilities stay the same. Value of learningRate
    // stays the same because there seems to be no good reason to select
    // otherwise.
    //
    // Precondition
    //   Given categories are mutually exclusive i.e. no duplicates.
    // 
    // Complexity
    //   O(n*log(m) + m*log(n))
    //     where n = number of given categories and m = this.numCategories

    var i, cat,
        s = this.state,
        acd, acds;

    acd = new ACD(s.learningRate);
    acds = acd.state;

    // Previous event weight
    // There seems to be no good reason to change event weight
    acds.eventWeight = s.eventWeight;

    // Weights
    for (i = 0; i < categories.length; i += 1) {
      cat = categories[i];
      if (s.weights.hasOwnProperty(cat)) {
        acds.weights[cat] = s.weights[cat];
        acds.weightsSum += s.weights[cat];
      }
    }

    // Order
    for (i = 0; i < s.order.length; i += 1) {
      cat = s.order[i];
      if (acds.weights.hasOwnProperty(cat)) {
        acds.order.push(cat);
        acds.indices[cat] = acds.order.length - 1;
      }
    }

    return acd;
  };


  ACD.prototype.rank = function (events) {
    // Order of the given events in the list of most probable categories.
    // Most probable category has rank 0.
    // 
    // Return array of integers.

    var result = [],
        i, ev, p,
        s = this.state;

    if (typeof events === 'string') {
      throw new NotAnArrayException();
    } else if (typeof events === 'undefined') {
      events = s.order; // stupid because result is [0, 1, 2, ...]
    }
 
    for (i = 0; i < events.length; i += 1) {
      ev = events[i];
      if (s.indices.hasOwnProperty(ev)) {
        result.push(s.indices[ev]);
      } else {
        result.push(Infinity);
      }
    }

    return result;
  };


  ACD.prototype.each = function (iterator, context) {
    // Execute function over all categories in probability order.
    // 
    // Parameter
    //   Iterator
    //     A function.
    //   context (optional)
    //     Call the iterator in this context.
    // 
    // Iterator
    //   iterator(category, probability, rank)
    // 
    // Return this for chaining.
    var i, cat, prob, index,
        s = this.state;
    var len = s.order.length;
    for (i = 0; i < len; i += 1) {
      cat = s.order[i];
      prob = s.weights[cat] / s.weightsSum;
      index = s.indices[cat];
      iterator.call(context, cat, prob, index);
    }
    return this;
  };


  ACD.prototype.map = function (iterator, context) {
    // Transform categories to an array. Iterator defines how the categories
    // are transformed and is called in probability order.
    // 
    // Parameter
    //   Iterator
    //     A function. Should return something.
    //   context (optional)
    //     Call the iterator in this context.
    // 
    // Iterator
    //   iterator(category, probability, rank)
    // 
    // Return this for chaining.
    var results = [];
    this.each(function (cat, prob, rank) {
      results.push(iterator.call(context, cat, prob, rank));
    });
    return results;
  };


  ACD.prototype.sample = function (n, isOrdered) {
    // Draw n samples from the distribution.
    // 
    // Parameter
    //   n (optional, default 1)
    //     How many samples
    //   isOrdered (optional, default false)
    //     If true, results are ordered most probable samples first.
    //     This can be done without additional penalty to efficiency.
    //
    // Return
    //   array of events. Empty array if no data or if n = 0
    //
    // Complexity
    //   Mixed O(n*m) and O(n+m) where m is number of categories

    var manyCategories, r,
        s = this.state;

    // Normalize params
    if (typeof n !== 'number') { n = 1; }
    if (typeof isOrdered !== 'boolean') { isOrdered = false; }

    // Two algorithms to choose from
    if (isOrdered) {
      r = sampleOrdered(this, n);
    } else {

      manyCategories = s.order.length > 30;
      if (manyCategories) {
        r = shuffle(sampleOrdered(this, n));
      } else {
        r = sampleSimple(this, n);
      }
    }
    return r;
  };


  ACD.prototype.numCategories = function () {
    // Return number of categories in memory.
    return this.state.order.length;
  };


  ACD.prototype.dump = function () {
    // Serialize to a shallow array.
    // See also load()
    var i, cat, weight,
        s = this.state,
        d = [];

    // Categories and weights.
    // Normalize so that event weight is 1 and can be omitted.
    for (i = 0; i < s.order.length; i += 1) {
      cat = s.order[i];
      weight = s.weights[cat];
      d.push(cat);
      d.push(weight / s.eventWeight);
    }

    // learningRate
    // JSON does not support Infinity so use null.
    if (s.learningRate === Infinity) {
      d.push(null);
    } else {
      d.push(s.learningRate);
    }

    // eventWeight can be omitted because it is 1.

    return d;
  };


  ACD.prototype.copy = function () {
    // Return a copy of this distribution.
    var c = new ACD();
    c.load(this.dump());
    return c;
  };


  ACD.prototype.print = function (precision) {
    // Return human readable string representation of the distribution.
    // 
    // Parameter
    //   precision (optional, default 2)
    // 
    var s = this.state,
        i, cat, prob, probs,
        j, maxCatStrLen = 0;
    var len = s.order.length;
    var result = '';

    if (typeof precision !== 'number') {
      precision = 2;
    }

    // Limit to range [0, 10]
    precision = Math.max(Math.min(precision, 10), 0);
    
    probs = this.prob(s.order);

    // Find padding width
    for (i = 0; i < len; i += 1) {
      cat = s.order[i];
      maxCatStrLen = Math.max(maxCatStrLen, cat.length);
    }

    for (i = 0; i < len; i += 1) {
      cat = s.order[i];
      prob = probs[i];

      // Pad cat to the length of the longest
      for (j = cat.length; j < maxCatStrLen; j += 1) {
        cat = cat + ' ';
      }

      result += cat + ' ' + prob.toFixed(precision) + '\n';
    }

    return result;
  };






  
  // Mutators

  ACD.prototype.learn = function (events) {
    // Increase the weights of the categories of the events
    // 
    // Parameter
    //   events
    //     an array of events
    // 
    // Return this for chaining

    var i, ev, s, nextEventWeight;
    s = this.state;

    // Without special handling of s.eventWeight === 0, it stays zero even
    // when s.learningRate is not.
    if (s.eventWeight === 0) {
      s.eventWeight = 1;
    }

    // Increase weight
    for (i = 0; i < events.length; i += 1) {

      // Avoid arithmetic overflow by normalizing the distribution.
      // Normalization complexity is O(n) so normalize only when needed.
      // Risky variables are s.weights, s.weightsSum and s.eventWeight.

      // Risky situation 1
      // s.learningRate is Infinity.
      if (s.learningRate > Number.MAX_VALUE) {
        multiplyWeights(this, 0);
        s.eventWeight = 1;
      } else {
        // assert s.learningRate < Infinity

        // Risky situation 2
        // s.eventWeight grows to Infinity.
        nextEventWeight = s.eventWeight * s.learningRate;
        if (nextEventWeight > Number.MAX_VALUE) {
          // Multiply all so that eventWeight drops back to 1 and 
          // can therefore be multiplied by s.learningRate without
          // breaking the upper limit.
          multiplyWeights(this, 1 / s.eventWeight);
          s.eventWeight = s.learningRate;
        } else {

          // Risky situation 3
          // s.weightsSum grows to Infinity.
          // Because s.weightsSum >= s.weights[ev] for all ev, s.weights[ev]
          // do not need separate risk handling.
          if (s.weightsSum + nextEventWeight > Number.MAX_VALUE) {
            // Multiply all so that s.weightsSum drops back to 1.
            s.eventWeight *= s.learningRate / s.weightsSum;
            multiplyWeights(this, 1 / s.weightsSum);
          } else {

            // Default case.
            // Change the importancy of the new event
            s.eventWeight *= s.learningRate;
          }
        }
      }

      ev = events[i];
      if (s.weights.hasOwnProperty(ev)) {
        s.weights[ev] += s.eventWeight;
      } else {
        s.weights[ev] = s.eventWeight;
        s.order.push(ev);
        s.indices[ev] = s.order.length - 1;
      }

      // Update the sum
      s.weightsSum += s.eventWeight;

      // Move the category to its place.
      sortOne(this, ev);
    }

    return this;
  };
  

  ACD.prototype.unlearn = function (events) {
    // Decrease the weights of these events.
    // Inverse of learn.
    // 
    // Parameter
    //   events
    //     an array of events
    // 
    // Return this for chaining

    var s, i, cat, newWeight, delta;
    
    s = this.state;

    for (i = 0; i < events.length; i += 1) {
      cat = events[i];

      if (s.weights.hasOwnProperty(cat)) {

        // Decrease weight and limit to zero
        newWeight = Math.max(0, s.weights[cat] - s.eventWeight);
        delta = newWeight - s.weights[cat];
        s.weights[cat] = newWeight;

        // Decrease sum the same amount
        s.weightsSum += delta; // delta < 0

        // Move the category to its place.
        sortOne(this, cat);

        if (s.learningRate !== 0) {
          s.eventWeight /= s.learningRate;
        }
      } // else do nothing
    }

    return this;
  };


  ACD.prototype.learningRate = function (newLearningRate) {
    // Get or set learningRate.
    var s, delta, i;
    s = this.state;

    if (typeof newLearningRate === 'undefined') {
      return s.learningRate;
    } // else

    if (typeof newLearningRate !== 'number') {
      // Invalid parameter; do nothing
      return this;
    }

    // Limit
    newLearningRate = Math.max(0, newLearningRate);

    // Assert s.weightsSum === newMemorySize
    s.learningRate = newLearningRate;

    return this;
  };


  ACD.prototype.dist = function (newDistribution) {
    // Get or set the whole distribution. If newDistribution is not set,
    // a normalized distribution object is returned. Otherwise this is
    // returned.
    // 
    // Parameter
    //   newDistribution (optional)
    //     Object where keys are the categories and values the weights.
    //     Does not have to be normalized (i.e. sum can be other than 1)
    //     e.g. {red: 1.1, blue: 5, green: 2.1}
    //     If distribution was empty before this new, next event
    //     will have weight of 1.
    //     If omitted, return the current distiribution

    var s, w, distr, cat,
        newWeights, newWeightsSum, newOrder, newIndices,
        weight, i;
    s = this.state;

    if (typeof newDistribution === 'undefined') {
      w = s.weights;

      if (s.weightsSum === 0) {
        // All weights must be 0
        return clone(w);
      } // else

      // Return current distribution in normalized form.
      distr = {};
      for (cat in s.weights) {
        if (w.hasOwnProperty(cat)) {
          distr[cat] = w[cat] / s.weightsSum;
        }
      }
      return distr;
    } // else

    if (typeof newDistribution !== 'object') {
      throw new InvalidDistributionException();
    } // else

    // Set new distribution

    // Calculate the sum and see if it's valid number.
    // At the same time copy the distribution.
    newWeights = {};
    newWeightsSum = 0;
    newOrder = [];
    for (cat in newDistribution) {
      if (newDistribution.hasOwnProperty(cat)) {
        weight = newDistribution[cat];
        if (weight >= 0) {
          newWeights[cat] = weight;
          newWeightsSum += weight;
          newOrder.push(cat);
        } else {
          throw new InvalidDistributionException();
        }
      }
    }
    // assert all newWeights > 0

    if (isNaN(newWeightsSum) || newWeightsSum === Infinity) {
      throw new InvalidDistributionException();
    }

    // Order the categories
    newOrder.sort(function (a, b) {
      return newWeights[b] - newWeights[a];
    });

    // Build indices
    newIndices = {};
    for (i = 0; i < newOrder.length; i += 1) {
      newIndices[newOrder[i]] = i;
    }

    // Adjust eventWeight so that it would have similar effect as before.
    // The effect is proportional to the weightsSum.
    if (newWeightsSum === 0 || s.weightsSum === 0) {
      s.eventWeight = 1;
    } else {
      s.eventWeight = s.eventWeight * newWeightsSum / s.weightsSum;
    }

    s.weights = newWeights;
    s.weightsSum = newWeightsSum;
    s.order = newOrder;
    s.indices = newIndices;

    return this;
  };


  ACD.prototype.load = function (dumpedData) {
    // Load everything from a serialized array.
    // 
    // Precondition
    //   dumped contains weights in probability order, most probable first.
    // 
    // Return this for chaining.

    var i, cat, count, s, rate, weight;

    if (dumpedData.length < 1 || dumpedData.length % 2 !== 1) {
      throw new InvalidDumpException();
    }

    // Init
    s = {
      weights: {},
      weightsSum: 0,
      eventWeight: 1,
      learningRate: 1,
      order: [],
      indices: {}
    };

    // Pairs
    for (i = 0; i < dumpedData.length - 2; i += 2) {
      cat = dumpedData[i];
      count = dumpedData[i + 1];
      s.weights[cat] = count;
      s.weightsSum += count;
      s.order.push(cat);
      s.indices[cat] = s.order.length - 1;
    }

    this.state = s;

    // Last value is learningRate.
    // JSON converts Infinity to null.
    rate = dumpedData[i];
    if (rate === null) {
      s.learningRate = Infinity;
    } else {
      this.learningRate(rate);
    }

    return this;
  };
  





  // Customization.
  // Make possible to create plugins that attach methods to the instance.
  // Usage: CategoricalDistribution.extension.myMethod = function (...) {...};
  exports.extension = ACD.prototype;






  ///////////////
  return exports;

}());
