/*

Adapting Categorical Distribution

Based on a paper
Palén 2014. Adapting categorical distribution.

Adaptation rate r is a number in a closed range [0, 1].
r = 0: no adaptation. All events matter equally.
r = 1: infinite adaptation. Only the last event matters.

Following paragraphs are DEPRECATED

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



  // Private module constants
  // TODO capitalize
  var massSumMax = 1000000; // TODO intelligent value
  var defaultAdaptationRate = 0.1;

  // Public module constants
  exports.DEFAULT_ADAPTATION_RATE = defaultAdaptationRate;

  // Private methods
  
  var prob = function (weight, learningRate, massSum) {
    // Return probability
    var w, r, t, rt, logr;
    w = weight;
    r = learningRate;
    t = massSum;

    if (t === 0) {
      // Empty distribution
      return 0;
    } // else
    
    if (r === 0) {
      return w;
    } // else

    if (r === 1) {
      return w / t;
    } // else

    rt = Math.pow(r, t);
    logr = Math.log(r);
    return w * rt * logr / (rt - 1);
  };

  var massSum = function (learningRate, weightSum) {
    // Mass calculated from the weightSum. For special cases where
    // weightSum is known.
    // 
    // Parameter
    //   learningRate in open range (0, 1)
    //   weightSum in semiopen range [0, Inf)
    var logRate = Math.log(learningRate);
    return -Math.log(1 - weightSum * logRate) / logRate;
  };

  var weightSum = function (learningRate, massSum) {
    // Weight sum calculated from massSum.
    var r = learningRate;
    var rt, logr;
    if (r === 0) {
      return 1;
    } // else
    if (r === 1) {
      return massSum;
    } // else
    rt = Math.pow(r, massSum);
    logr = Math.log(r);
    return (rt - 1) / (rt * logr);
  };

  var learn = function (acd, cat, mass) {
    var s, w, r, logr, t, m, rm, rt, limitedMass;
    s = acd.state;
    r = s.rate;
    logr = Math.log(r);
    t = s.mass;
    m = mass;
    var nw, nt;

    if (s.weights.hasOwnProperty(cat)) {
      w = s.weights[cat];
    } else {
      w = 0;
    }

    if (t + m > massSumMax) {
      // TODO normalize
    }

    if (r === 0) {
      multiplyWeights(acd, 0);
      nw = 1;
      nt = -Math.log(1 - logr) / logr;
    } else if (r === 1) {
      nw = w + m;
      nt = t + m;
    } else {
      rm = Math.pow(r, m);
      rt = Math.pow(r, t);
      nw = w + (rm - 1) / (rm * rt * logr);
      if (nw < 0) {
        // Limit weight to zero.
        limitedMass = -Math.log(1 + w * rt * logr) / logr;
        nw = 0;
        nt = t + limitedMass;
      } else {
        nt = t + m;
      }
    }
    
    // Update the distribution

    updateWeight(acd, cat, nw);
    s.mass = nt;
  };

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

  var updateWeight = function (acd, cat, weight) {
    // Updates the weight of a category and abstracts out the maintenance of
    // $order and $indices.

    var s = acd.state;

    if (!s.weights.hasOwnProperty(cat)) {
      // Unknown category
      s.order.push(cat);
      s.indices[cat] = s.order.length - 1;
    }
    s.weights[cat] = weight;

    // Move the category to its place.
    sortOne(acd, cat);
  };

  var multiplyWeights = function (acd, multiplier) {
    // Multiply weights and update mass
    //
    // Precondition
    //   multiplier >= 0

    var s, len, newWeightsSum, ratio, i, cat;
    
    s = acd.state;
    len = s.order.length;

    newWeightsSum = 0;
    for (i = 0; i < len; i += 1) {
      cat = s.order[i];
      s.weights[cat] *= multiplier;
      newWeightsSum += s.weights[cat];
    }

    s.mass = massSum(s.rate, newWeightsSum);
  };

  var normalize = function (acd) {
    // Update the weights and mass so that weightSum === 1.
    if (acd.mass === 0) {
      return;
    } // else
    if (acd.rate === 0) {
      // TODO
    } else if (acd.rate === 1) {
      // TODO
    } else {
      // TODO
    }
  };

  var sampleSimple = function (acd, n) {
    // Take N samples randomly.
    // Complexity O(n * m) where m is num of categories. This because
    // cumulative distribution function is recalculated for every sample.
    var x, i, j, maxSum, cumulativeSum,
        result = [],
        s = acd.state;

    if (s.order.length === 0 || n <= 0) {
      return result;
    } // else

    maxSum = weightSum(s.rate, s.mass);

    for (i = 0; i < n; i += 1) {
      x = randomFromInterval(0, maxSum);
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

    var rands, cat, maxSum, cumulativeSum, i, r,
        result = [],
        s = acd.state;

    if (s.order.length === 0 || n <= 0) {
      return result; // empty array
    } // else

    maxSum = weightSum(s.rate, s.mass);

    rands = randomOrderedSetFromInterval(n, 0, maxSum);

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

  var InvalidAdaptationRateException = function () {
    this.name = 'InvalidAdaptationRateException';
    this.message = 'Adaptation rate should be a real ' +
                   'number in closed range [0, 1].';
  };

  var InvalidDistributionException = function () {
    this.name = 'InvalidDistributionException';
    this.message = 'Distribution is in unknown form.';
  };

  var InvalidMassException = function () {
    this.name = 'InvalidMassException';
    this.message = 'Mass must be a number.';
  };


  exports.NotAnArrayException = NotAnArrayException;
  exports.InvalidDumpException = InvalidDumpException;
  exports.InvalidAdaptationRateException = InvalidAdaptationRateException;
  exports.InvalidDistributionException = InvalidDistributionException;
  exports.InvalidMassException = InvalidMassException;





  // Constructor

  var ACD = function (adaptationRate) {
    // Parameter
    //   adaptationRate (optional, default 0)
    //     positive number in closed range [0, 1]
    //       0.0: Every event has equal effect regardless of their order.
    //       0.2: An event has 1/(1-0.2) larger effect than the previous.
    //       1.0: Only the last event matters.

    this.state = {
      weights: {}, // Weight for each category
      mass: 0, // Sum of event masses in the distribution.
      rate: 1 - defaultAdaptationRate, // Learning rate = 1 - adaptationRate
      lograte: Infinity, // Cached log(learning rate)
      order: [], // Ordered most probable category first.
      indices: {} // Category indices in $order array
    };

    this.adaptationRate(adaptationRate);
  };

  exports.create = function (param1) {
    return new ACD(param1);
  };
    





  // Accessors

  ACD.prototype.prob = function (events) {
    // Probabilities of given events
    // 
    // Return
    //   array of probabilities
    //     if $events is array
    //   probability
    //     if $events is string

    var result, single,
        i, ev,
        s = this.state;

    if (typeof events === 'string') {
      events = [events];
      single = true;
    } else {
      single = false;
    }

    if (typeof events === 'undefined') {
      events = s.order;
    }

    result = [];

    for (i = 0; i < events.length; i += 1) {
      ev = events[i];
      if (s.weights.hasOwnProperty(ev)) {
        result.push(prob(s.weights[ev], s.rate, s.mass));
      } else {
        result.push(0);
      }
    }

    if (single) {
      return result[0];
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


  ACD.prototype.peak = function (tolerance) {
    // Return most probable category (probability X) and all those categories
    // whose probability differs from X by not more than
    // tolerance * 100 percent.
    //
    // Parameter
    //   tolerance
    //     number in closed interval [0, 1]
    // 
    // Return array of categories

    var i, headLikelihood, minLikelihood,
        s = this.state;

    if (s.order.length === 0) {
      return [];
    } // else len > 0

    headLikelihood = s.weights[s.order[0]];
    minLikelihood = headLikelihood - headLikelihood * tolerance;

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
    // the ratios between probabilities stay the same. Value of adaptingRate
    // stays the same.
    //
    // Precondition
    //   Given categories are mutually exclusive i.e. no duplicates.
    // 
    // Complexity
    //   TODO

    var i, cat,
        origState = this.state,
        origWeightSum,
        sub, subState, subMassSum, subWeightSum;

    sub = new ACD(1 - origState.rate);
    subState = sub.state;

    if (typeof categories === 'string') {
      categories = [categories];
    }

    // Weights
    subWeightSum = 0;
    for (i = 0; i < categories.length; i += 1) {
      cat = categories[i];
      if (origState.weights.hasOwnProperty(cat)) {
        subState.weights[cat] = origState.weights[cat];
        subWeightSum += origState.weights[cat];
      }
    }

    // Mass
    subMassSum = massSum(origState.rate, subWeightSum);
    subState.mass = subMassSum;

    // Order
    for (i = 0; i < origState.order.length; i += 1) {
      cat = origState.order[i];
      if (subState.weights.hasOwnProperty(cat)) {
        subState.order.push(cat);
        subState.indices[cat] = subState.order.length - 1;
      }
    }

    return sub;
  };


  ACD.prototype.rank = function (categories) {
    // Order of the given categories in the list of most probable categories.
    // Most probable category has rank 0. Unknown category has rank Infinity.
    // 
    // Return
    //   array of integers
    //     if $categories is array
    //   integer
    //     if $categories is string

    var result,
        i, ev, p,
        s = this.state;

    if (typeof categories === 'string') {
      if (s.indices.hasOwnProperty(categories)) {
        return s.indices[categories];
      } // else
      return Infinity;
    } // else

    if (typeof categories === 'undefined') {
      categories = s.order; // stupid because result is [0, 1, 2, ...]
    }
 
    result = [];
    for (i = 0; i < categories.length; i += 1) {
      ev = categories[i];
      if (s.indices.hasOwnProperty(ev)) {
        result.push(s.indices[ev]);
      } else {
        result.push(Infinity);
      }
    }

    return result;
  };


  ACD.prototype.each = function (iterator, context) {
    // Execute a function over the categories in probability order.
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
    var i, cat, pr, index, order,
        s = this.state;
    order = s.order.slice(0); // copy because order may change during each
    var len = order.length;
    for (i = 0; i < len; i += 1) {
      cat = order[i];
      pr = prob(s.weights[cat], s.rate, s.mass);
      index = s.indices[cat];
      iterator.call(context, cat, pr, index);
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

      manyCategories = s.order.length > 30; // 30 is only a guess
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
    for (i = 0; i < s.order.length; i += 1) {
      cat = s.order[i];
      d.push(cat);
      d.push(s.weights[cat]);
    }

    // adaptation rate
    d.push(1 - s.rate);

    // No need to include mass as it can be calculated from the weights.

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

  ACD.prototype.learn = function (events, mass) {
    // Increase the weights of the categories of the events.
    // 
    // Parameter
    //   events
    //     a single event or an array of events
    //   mass (optional, default 1)
    //     Like a multiplier for an event. How large effect to
    //     the distribution the event has when compared to the events
    //     with default mass 1. Supports also negative mass.
    // 
    // Return this for chaining.

    var i, s;
    s = this.state;

    if (typeof events === 'string') {
      events = [events];
    }

    if (typeof mass === 'undefined') {
      mass = 1;
    }

    if (typeof mass !== 'number') {
      throw new InvalidMassException();
    } // else

    // Increase weight
    for (i = 0; i < events.length; i += 1) {
      learn(this, events[i], mass);
    }

    return this;
  };
  

  ACD.prototype.unlearn = function (events, mass) {
    // Decrease the weights of these events.
    // Inverse of learn.
    // 
    // Parameter
    //   events
    //     a single event or an array of events
    //   mass (optional, default 1)
    //     See d.learn.
    // 
    // Return this for chaining

    if (typeof mass === 'undefined') {
      mass = 1;
    }

    if (typeof mass !== 'number') {
      throw new InvalidMassException();
    } // else

    return this.learn(events, -mass);
  };


  ACD.prototype.adaptationRate = function (newAdaptationRate) {
    // Get or set adaptationRate.
    var s, newRate;
    s = this.state;

    if (typeof newAdaptationRate === 'undefined') {
      return 1 - s.rate;
    } // else

    if (typeof newAdaptationRate !== 'number' ||
        newAdaptationRate < 0 ||
        newAdaptationRate > 1) {
      throw new InvalidAdaptationRateException();
    } // else

    newRate = 1 - newAdaptationRate;

    // TODO change mass.

    s.rate = newRate;

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

      if (s.mass === 0) {
        // All weights must be 0
        return clone(w);
      } // else

      // Return current distribution in normalized form.
      distr = {};
      for (cat in s.weights) {
        if (w.hasOwnProperty(cat)) {
          distr[cat] = prob(w[cat], s.rate, s.mass);
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

    s.weights = newWeights;
    s.mass = massSum(s.rate, newWeightsSum);
    s.order = newOrder;
    s.indices = newIndices;

    return this;
  };


  ACD.prototype.load = function (dumpedData) {
    // Load everything from a serialized array.
    // 
    // Precondition
    //   dumped contains weights in probability order, most probable first.
    //   dumped contains adaptationRate as the last
    // 
    // Return this for chaining.

    var i, cat, weight, nextMassSum, s, weightsSum;

    if (dumpedData.length < 1 || dumpedData.length % 2 !== 1) {
      throw new InvalidDumpException();
    }

    // Init
    s = {
      weights: {},
      mass: 0,
      rate: 1 - defaultAdaptationRate,
      order: [],
      indices: {}
    };
    weightsSum = 0;

    // Pairs
    for (i = 0; i < dumpedData.length - 2; i += 2) {
      cat = dumpedData[i];
      weight = dumpedData[i + 1];
      s.weights[cat] = weight;
      weightsSum += weight;
      s.order.push(cat);
      s.indices[cat] = s.order.length - 1;
    }

    // Second last value is adaptationRate.
    s.mass = massSum(dumpedData[i], weightsSum);
    s.rate = 1 - dumpedData[i];

    this.state = s;

    return this;
  };
  





  // Customization.
  // Make possible to create plugins that attach methods to the instance.
  // Usage: CategoricalDistribution.extension.myMethod = function (...) {...};
  exports.extension = ACD.prototype;






  ///////////////
  return exports;

}());
