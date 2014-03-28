/*

Adapting Categorical Distribution

In this distribution every category has its own integer counter. When
an event belonging to a category is taught to the distribution the counter of
the category is increased by one. The events in the category with the biggest
counter are the most probable ones. Probability of an event is the proportion
of the counter of its category to the sum of all the distribution's counters.

To avoid categories growing limitlessy and allow the distribution to adapt to
change, there must be limits for the number of categories and the number in
counters. Limiting the number of categories affects to the computation time
positively. Limiting the counters speeds up adaptation but decreases noise
resistance and therefore stability.

Let the two dimensions be maxCategorySize and maxNumCategories. These form
a dependent dimension maxSize = maxCategorySize * maxNumCategories. Here
maxSize equals to the maximum number of counters in the distribution.

For this distribution maxSize is selected to be the only input parameter.
Only the sum of the counters is important. Therefore no hard limits are set
for maxCategorySize and maxNumCategories even though they are still limited
by maxSize but in more dynamical manner. For example with maxSize = 8 there
could be two categories with 2 and 6 in their counters or four categories
with 1, 3, 2 and 2.

If the limit is exceeded a forgetting algorithm must be applied. There are
multiple options for such algorithm (n = number of categories):
- Random: decrease a randomly selected counter. O(1)
- Normalized Random: decrease a sampled counter.
- Divide: multiply counters by number smaller than 1 to meet the limit. O(n)
- Subtract: subtract counters by 1 / numCategories. O(n)
- FIFO: First in first out. Decrease the counter of the oldest event. O(n)
- LRU: Decrease the counter of least recently increased (used) category. O(?)
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

TODO
- Decide the forgetting algorithm

*/

myModule.CategoricalDistribution = (function () {
  var exports = {};
  /////////////////

  
  var sortOne = function (acd, category) {
    // Move event category to its position in a manner similar to
    // insertion sort.
    // 
    // Precondition
    //   $category is only out of order category in $order.
    //   $category exists in $counters, $indices and in $order.
    var s, i, c, backwards, isLast, isFirst, tempCat;

    s = acd.state;
    i = s.indices[category];
    c = s.counters[category];

    // Recognize direction
    isLast = (i === s.order.length - 1);
    isFirst = (i === 0);
    if (isLast) {
      backwards = true;
    } else if (isFirst) {
      backwards = false;
    } else {
      // assert: at least one before and at least one after.
      if (s.counters[s.order[i - 1]] < c) {
        backwards = true;
      } else {
        backwards = false;
      }
    }

    // Move until category in its place.
    // Place most recent as front as possible.
    if (backwards) {
      while (i !== 0 && s.counters[s.order[i - 1]] <= c) {
        // Swap towards head
        tempCat = s.order[i - 1];
        s.order[i] = tempCat;
        s.order[i - 1] = category;
        s.indices[tempCat] = i;
        i -= 1;
      }
    } else {
      while (i !== s.order.length - 1 && s.counters[s.order[i + 1]] > c) {
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
      x = randomFromInterval(0, s.countersSum);
      cumulativeSum = 0;
      for (j = 0; j < s.order.length; j += 1) {
        // Add to cumulative sum until greater.
        // Because random max is exclusive, counter sum
        // will be greater at the last event at the latest.
        cumulativeSum += s.counters[s.order[j]];
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

    rands = randomOrderedSetFromInterval(n, 0, s.countersSum);

    cat = 0;
    cumulativeSum = s.counters[s.order[cat]];

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
          cumulativeSum += s.counters[s.order[cat]];
        } while (cumulativeSum <= r);

        result.push(s.order[cat]);
      }
    }

    // Results in probability order.
    return result;
  };

  

  // Constructor

  var ACD = function (maxSize) {
    // Parameter
    //   maxSize (optional, default 0)
    //     positive integer
    //       0: unlimited size

    // Normalize params
    if (typeof maxSize !== 'number') { maxSize = 0; }

    this.state = {
      counters: {}, // Counter for each category
      countersSum: 0, // Sum of $counters
      maxSize: maxSize, // maxCountersSum
      order: [], // Ordered most probable category first.
      indices: {} // Category indices in $order array
    };
  };

  exports.create = function (param) {
    return new ACD(param);
  };
    


  // Accessors

  ACD.prototype.prob = function (events) {
    // Probabilities of given events
    // 
    // Return array of numbers.

    var result = [],
        i, ev, p;
 
    for (i = 0; i < events.length; i += 1) {
      ev = events[i];
      if (this.state.counters.hasOwnProperty(ev)) {
        p = this.state.counters[ev] / this.state.countersSum;
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

    headLikelihood = s.counters[s.order[0]];
    minLikelihood = headLikelihood - headLikelihood * deviationTolerance;

    for (i = 1; i < s.order.length; i += 1) {
      if (minLikelihood > s.counters[s.order[i]]) {
        break;
      } // else include i:th category
    }

    // Do not include i:th category.
    return s.order.slice(0,i);
  };

  ACD.prototype.subset = function (categories) {
    // Return new adaptingCategoricalDistribution that has only the specified
    // event categories. Counters stay the same, probabilities may change but
    // the ratios between probabilities stay the same. Value of maxSize stays
    // the same because there seems to be no good reason to select otherwise.
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

    acd = new ACD(s.maxSize);
    acds = acd.state;

    // Counters
    for (i = 0; i < categories.length; i += 1) {
      cat = categories[i];
      if (s.counters.hasOwnProperty(cat)) {
        acds.counters[cat] = s.counters[cat];
        acds.countersSum += s.counters[cat];
      }
    }

    // Order
    for (i = 0; i < s.order.length; i += 1) {
      cat = s.order[i];
      if (acds.counters.hasOwnProperty(cat)) {
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

  ACD.prototype.size = function () {
    // Sum of the counters.
    // 
    // Return positive integer.
    return this.state.countersSum;
  };

  ACD.prototype.numCategories = function () {
    // Return number of categories in memory.
    return this.state.order.length;
  };

  ACD.prototype.dump = function () {
    // Serialize to a shallow array.
    // See also load()
    var i, cat, count,
        s = this.state,
        d = [];

    // Categories and counters
    for (i = 0; i < s.order.length; i += 1) {
      cat = s.order[i];
      count = s.counters[cat];
      d.push(cat);
      d.push(count);
    }

    // Max size
    d.push(s.maxSize);

    return d;
  };

  ACD.prototype.copy = function () {
    // Return a copy of this distribution.
    var c = new ACD();
    c.load(this.dump());
    return c;
  };


  
  // Mutators

  ACD.prototype.learn = function (events) {
    // Increase the counters of the categories of the events
    // 
    // Parameter
    //   events
    //     an array of events
    // 
    // Return this for chaining

    var i, ev, nextRobin,
        s = this.state;

    // Increase counter
    for (i = 0; i < events.length; i += 1) {

      if (s.maxSize > 0 && s.countersSum + 1 > s.maxSize) {
        // Decrease using algorithm Normalized Random.
        // Assert: s.countersSum > 0
        // Assert: s.order.length > 0
        this.unlearn(this.sample());
      }

      ev = events[i];
      if (s.counters.hasOwnProperty(ev)) {
        s.counters[ev] += 1;
      } else {
        s.counters[ev] = 1;
        s.order.push(ev);
        s.indices[ev] = s.order.length - 1;
      }

      // Update the sum
      s.countersSum += 1;

      // Move the category to its place.
      sortOne(this, ev);
    }

    return this;
  };
    
  ACD.prototype.unlearn = function (events) {
    // Decrease the counters of these events
    // Parameter
    //   events
    //     an array of events
    // 
    // Return this for chaining

    var i, cat,
        s = this.state;

    // Decrease counter
    for (i = 0; i < events.length; i += 1) {
      cat = events[i];

      if (s.counters.hasOwnProperty(cat)) {
        s.counters[cat] -= 1;

        // Update the sum
        s.countersSum -= 1;

        // Move the category to its place.
        sortOne(this, cat);

        // Remove empty category. It's the last in order if there is one.
        if (s.counters[cat] <= 0) {
          s.order.pop();
          delete s.counters[cat];
          delete s.indices[cat];
        }
      } // else do nothing

    }

    return this;
  };

  ACD.prototype.maxSize = function (newMaxSize) {
    // Get or set maxSize.
    var delta, i;

    if (typeof newMaxSize !== 'number') {
      return this.state.maxSize;
    } // else

    delta = this.state.countersSum - newMaxSize;

    if (delta > 0) {
      // Need to decrease.
      // Decreasing floor(delta) is not enough because sum will stay higher
      // than maxSize. We must decrease by ceil(delta) times.
      for (i = 0; i < Math.ceil(delta); i += 1) {
        // We cannot use 
        // this.unlearn(this.sample(Math.ceil(delta)));
        // because unlearn affects to the samples.
        this.unlearn(this.sample());
      }
    }
    // Assert: countersSum <= newMaxSize
    this.state.maxSize = newMaxSize;
  };

  ACD.prototype.load = function (dumpedData) {
    // Load everything from a serialized array.
    // 
    // Precondition
    //   dumped contains counters in probability order, most probable first.
    // 
    // Return this for chaining.

    var i, cat, count, s;

    // Init
    s = {
      counters: {},
      countersSum: 0,
      maxSize: 0,
      order: [],
      indices: {}
    };

    // Pairs
    for (i = 0; i + 1 < dumpedData.length; i += 2) {
      cat = dumpedData[i];
      count = dumpedData[i + 1];
      s.counters[cat] = count;
      s.countersSum += count;
      s.order.push(cat);
      s.indices[cat] = s.order.length - 1;
    }

    // Last value is maxSize
    s.maxSize = dumpedData[i];

    this.state = s;
    return this;
  };
  


  ///////////////
  return exports;

}());
