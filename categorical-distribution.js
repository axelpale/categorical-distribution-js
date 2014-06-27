/*! categorical-distribution - v6.0.0 - 2014-06-27
 * https://github.com/axelpale/categorical-distribution-js
 *
 * Copyright (c) 2014 Akseli Palen <akseli.palen@gmail.com>;
 * Licensed under the MIT license */

(function (window, undefined) {
  'use strict';
  
  
  // Module name
  var myModule = {};
  
  
  
  // ten lines to ease counting and finding the lines in test output.


// Some convenient general purpose methods.

var isArray = function (possibleArray) {
  return Object.prototype.toString.call(possibleArray) === '[object Array]';
};

var toArray = function (value) {
  // Turn a value to an array.
  //   2       -> [2]
  //   'a'     -> ['a']
  //   [2]     -> [2]
  //   other   -> []
  if (typeof value === 'string' || typeof value === 'number') {
    return [value];
  }

  if (isArray(value)) {
    return value;
  } // else
  return [];
};

var randomFromInterval = function (min, max) {
  // Return a number for range [min,max)
  // http://stackoverflow.com/a/7228322/638546
  return Math.random() * (max - min) + min;
};

var randomOrderedSetFromInterval = function (n, min, max) {
  // N random numbers in order
  // 
  // Complexity
  //   O(n)
  // 
  // See http://www.mathpages.com/home/kmath452.htm
  var i,
      prev,
      normalized,
      x = [];

  if (typeof n !== 'number') {
    n = 1;
  }
  if (n < 1) {
    return x; // empty array
  }

  // Inverse cumulative distribution function for x[i]
  // invcdf(x, i) = 1 - (1 - x)^(1 / (n - i)) 

  // x[0]
  x.push(1 - Math.pow(Math.random(), 1 / n));

  // x[1] .. x[n - 1] 
  for (i = 1; i < n; i += 1) {
    prev = x[x.length - 1];
    normalized = 1 - Math.pow(Math.random(), 1 / (n - i));
    x.push(prev + (1 - prev) * normalized);
  }

  // Transfer to interval
  for (i = 0; i < n; i += 1) {
    x[i] = min + (max - min) * x[i];
  }

  return x;
};

var shuffle = function (array) {
  // Shuffle the array randomly using Fisher-Yates shuffle algorithm.
  // See http://stackoverflow.com/a/6274398/638546

  var counter = array.length, temp, index;

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter -= 1;

    // And swap the last element with it
    temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
};

var clone = function (obj) {
  // Copy the object
  // http://stackoverflow.com/a/728694/638546
  if (null === obj || 'object' !== typeof obj) { return obj; }
  var copy = obj.constructor();
  for (var attr in obj) {
    if (obj.hasOwnProperty(attr)) { copy[attr] = obj[attr]; }
  }
  return copy;
};

// The following lines are needed to test the util functions from outside.
myModule.util = {
  isArray: isArray,
  toArray: toArray,
  randomFromInterval: randomFromInterval,
  randomOrderedSetFromInterval: randomOrderedSetFromInterval,
  shuffle: shuffle,
  clone: clone
};

/*

Categorical Distribution

Related
- unigram
- http://en.wikipedia.org/wiki/Bag_of_words_model
- http://en.wikipedia.org/wiki/Categorical_distribution

*/

myModule.CategoricalDistribution = (function () {
  var exports = {};
  /////////////////



  // Private module constants
  var EXAMPLE = 777;

  // Public module constants
  exports.EXAMPLE = EXAMPLE;




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

  var InvalidWeightException = function () {
    this.name = 'InvalidWeightException';
    this.message = 'Weight must be a number.';
  };

  var OverflowException = function () {
    this.name = 'OverflowException';
    this.message = 'A value grew greater than is possible to represent.';
  };


  // Make exceptions public to be catchable
  exports.NotAnArrayException = NotAnArrayException;
  exports.InvalidDumpException = InvalidDumpException;
  exports.InvalidDistributionException = InvalidDistributionException;
  exports.InvalidWeightException = InvalidWeightException;
  exports.OverflowException = OverflowException;





  // Private methods
  
  var prob = function (weight, weightSum) {
    // Return probability
    if (weightSum === 0) {
      return 0;
    } // else
    return weight / weightSum;
  };

  var learn = function (cd, cat, weight) {
    // Modifies $cd, returns nothing
    // 
    // Throws
    //   OverflowException

    var st = cd.state,
        oldW, newW,
        oldWSum, newWSum;

    oldWSum = st.wSum;

    if (st.w.hasOwnProperty(cat)) {
      oldW = st.w[cat];
    } else {
      // Unknown category
      oldW = 0;
      st.order.push(cat);
      st.indices[cat] = st.order.length - 1;
    }

    newW = oldW + weight;
    
    if (newW < 0) {
      // Limit to zero
      newW = 0;
      newWSum = oldWSum - oldW;
    } else {
      newWSum = oldWSum + weight;
    }

    // Test overflow
    if (newW > Number.MAX_VALUE) {
      throw new OverflowException();
    }
    if (newWSum > Number.MAX_VALUE) {
      throw new OverflowException();
    }
  
    // Update the distribution

    st.w[cat] = newW;
    st.wSum = newWSum;

    sortOne(cd, cat);
  };

  var sortOne = function (cd, category) {
    // Move event category to its position in a manner similar to
    // insertion sort.
    // 
    // Precondition
    //   $category is only out of order category in $order.
    //   $category exists in $weights, $indices and in $order.
    var st, i, c, backwards, isLast, isFirst, tempCat;

    st = cd.state;
    i = st.indices[category];
    c = st.w[category];

    // Recognize direction
    isLast = (i === st.order.length - 1);
    isFirst = (i === 0);
    if (isLast) {
      backwards = true;
    } else if (isFirst) {
      backwards = false;
    } else {
      // assert: at least one before and at least one after.
      if (st.w[st.order[i - 1]] < c) {
        backwards = true;
      } else {
        backwards = false;
      }
    }

    // Move until category in its place.
    // Place most recent as front as possible.
    if (backwards) {
      while (i !== 0 && st.w[st.order[i - 1]] <= c) {
        // Swap towards head
        tempCat = st.order[i - 1];
        st.order[i] = tempCat;
        st.order[i - 1] = category;
        st.indices[tempCat] = i;
        i -= 1;
      }
    } else {
      while (i !== st.order.length - 1 && st.w[st.order[i + 1]] > c) {
        // Swap towards tail
        tempCat = st.order[i + 1];
        st.order[i] = tempCat;
        st.order[i + 1] = category;
        st.indices[tempCat] = i;
        i += 1;
      }
    }

    // Update category index
    st.indices[category] = i;
  };

  var updateWeight = function (cd, cat, weight) {
    // DEPRECATED, may be removed in future
    // 
    // Updates the weight of a category and abstracts out the maintenance of
    // $order and $indices.

    var st = cd.state;

    if (!st.weights.hasOwnProperty(cat)) {
      // Unknown category
      st.order.push(cat);
      st.indices[cat] = st.order.length - 1;
    }
    st.w[cat] = weight;

    // Move the category to its place.
    sortOne(cd, cat);
  };

  var multiplyWeights = function (cd, multiplier) {
    // DEPRECATED, may be removed in future
    // 
    // Multiply weights and update wSum
    //
    // Precondition
    //   multiplier >= 0

    var st, len, i, cat;
    
    st = cd.state;
    len = st.order.length;

    for (i = 0; i < len; i += 1) {
      cat = st.order[i];
      st.w[cat] *= multiplier;
    }

    st.wSum *= multiplier;
  };

  var normalize = function (acd) {
    // Update the weights and mass so that weightSum === 1.
    // TODO
  };

  var sampleSimple = function (cd, n) {
    // Take N samples randomly.
    // Complexity O(n * m) where m is num of categories. This because
    // cumulative distribution function is recalculated for every sample.
    var x, i, j, maxSum, cumulativeSum,
        result = [],
        st = cd.state;

    if (st.order.length === 0 || n <= 0) {
      return result;
    } // else

    maxSum = st.wSum;

    for (i = 0; i < n; i += 1) {
      x = randomFromInterval(0, maxSum);
      cumulativeSum = 0;
      for (j = 0; j < st.order.length; j += 1) {
        // Add to cumulative sum until greater.
        // Because random max is exclusive, weight sum
        // will be greater at the last event at the latest.
        cumulativeSum += st.w[st.order[j]];
        if (x < cumulativeSum) {
          result.push(st.order[j]);
          break;
        }
      }
    }

    return result;
  };


  var sampleOrdered = function (cd, n) {
    // Take N samples randomly but return them in probability order.
    // Calculates cumulative density function only once.
    // Complexity O(n + m) but has quite large overhead compared to.
    // sampleSimple. Good performance when there is large number of
    // categories (about 30 or more) even if the results need to be
    // shuffled.

    var rands, cat, maxSum, cumulativeSum, i, r,
        result = [],
        st = cd.state;

    if (st.order.length === 0 || n <= 0) {
      return result; // empty array
    } // else

    maxSum = st.wSum;

    rands = randomOrderedSetFromInterval(n, 0, maxSum);

    cat = 0;
    cumulativeSum = st.w[st.order[cat]];

    for (i = 0; i < n; i += 1) {
      r = rands[i];

      // Use < instead of <= because inclusive head, exclusive tail.
      if (r < cumulativeSum) {
        result.push(st.order[cat]);
      } else {
        do {
          // Add to cumulative sum until it becomes greater than $r.
          // Because the interval tail is exclusive, $cumulativeSum
          // will become greater than $r at least in the end.
          cat += 1;
          cumulativeSum += st.w[st.order[cat]];
        } while (cumulativeSum <= r);

        result.push(st.order[cat]);
      }
    }

    // Results in probability order.
    return result;
  };











  // Constructor

  var CatDist = function () {
    // Parameter
    //   -

    this.state = {
      w: {}, // Weight for each category.
      wSum: 0, // Sum of the weights.
      order: [], // Ordered most probable category first.
      indices: {} // Category indices in $order array.
    };

  };

  exports.create = function () {
    return new CatDist();
  };
    





  // Accessors

  CatDist.prototype.prob = function (cats) {
    // Probabilities of given categories
    // 
    // Return
    //   array of probabilities
    //     if $cats is array
    //   probability
    //     if $cats is string

    var result,
        single, // for knowing to return either array or number
        i, cat,
        st = this.state;

    if (typeof cats === 'string') {
      cats = [cats];
      single = true;
    } else {
      single = false;
    }

    if (typeof cats === 'undefined') {
      cats = st.order;
    }

    result = [];

    for (i = 0; i < cats.length; i += 1) {
      cat = cats[i];
      if (st.w.hasOwnProperty(cat)) {
        result.push(prob(st.w[cat], st.wSum));
      } else {
        result.push(0);
      }
    }

    if (single) {
      return result[0];
    }
    return result;
  };


  CatDist.prototype.head = function (n) {
    // N most probable categories
    // 
    // Parameter
    //   n (optional)
    //     Number of most probable categories in probability order.
    //     Omit to return all categories in probability order.
    // 
    // Return array of categories

    var st = this.state;
    if (typeof n !== 'number') {
      n = st.order.length;
    }

    n = Math.min(n, st.order.length);
    if (n > 0) {
      return st.order.slice(0, n);
    } // else
    return [];
  };


  CatDist.prototype.peak = function (tolerance) {
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
        st = this.state;

    if (st.order.length === 0) {
      return [];
    } // else len > 0

    headLikelihood = st.w[st.order[0]];
    minLikelihood = headLikelihood - headLikelihood * tolerance;

    for (i = 1; i < st.order.length; i += 1) {
      if (minLikelihood > st.w[st.order[i]]) {
        break;
      } // else include i:th category
    }

    // Do not include i:th category.
    return st.order.slice(0,i);
  };


  CatDist.prototype.subset = function (categories) {
    // Return new CategoricalDistribution that has only the specified
    // categories. Weights stay the same, so probabilities may change but
    // the ratios between probabilities stay the same.
    //
    // Precondition
    //   Given categories are mutually exclusive i.e. no duplicates.
    // 
    // Complexity
    //   O(n), where n is the num of cats in the orig distribution

    var i, cat,
        st = this.state,
        sub, subW, subWSum, subOrder, subIndices;

    subW = {};
    subWSum = 0;
    subOrder = [];
    subIndices = {};

    if (typeof categories === 'string') {
      categories = [categories];
    }

    // Weights
    for (i = 0; i < categories.length; i += 1) {
      cat = categories[i];
      if (st.w.hasOwnProperty(cat)) {
        subW[cat] = st.w[cat];
        subWSum += st.w[cat];
      }
    }

    // Order
    for (i = 0; i < st.order.length; i += 1) {
      cat = st.order[i];
      if (subW.hasOwnProperty(cat)) {
        subOrder.push(cat);
        subIndices[cat] = subOrder.length - 1;
      }
    }

    sub = new CatDist();
    sub.state.w = subW;
    sub.state.wSum = subWSum;
    sub.state.order = subOrder;
    sub.state.indices = subIndices;

    return sub;
  };


  CatDist.prototype.rank = function (categories) {
    // Order of the given categories in the list of most probable categories.
    // Most probable category has rank 0. Unknown category has rank Infinity.
    // 
    // Return
    //   array of integers
    //     if $categories is array
    //   integer
    //     if $categories is string

    var result,
        i, cat, p,
        st = this.state;

    if (typeof categories === 'string') {
      if (st.indices.hasOwnProperty(categories)) {
        return st.indices[categories];
      } // else
      return Infinity;
    } // else

    if (typeof categories === 'undefined') {
      categories = st.order; // stupid because result is [0, 1, 2, ...]
    }
 
    result = [];
    for (i = 0; i < categories.length; i += 1) {
      cat = categories[i];
      if (st.indices.hasOwnProperty(cat)) {
        result.push(st.indices[cat]);
      } else {
        result.push(Infinity);
      }
    }

    return result;
  };


  CatDist.prototype.each = function (iterator, context) {
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
        st = this.state;
    order = st.order.slice(0); // copy because order may change during each
    var len = order.length;
    for (i = 0; i < len; i += 1) {
      cat = order[i];
      pr = prob(st.w[cat], st.wSum);
      index = st.indices[cat];
      iterator.call(context, cat, pr, index);
    }
    return this;
  };


  CatDist.prototype.map = function (iterator, context) {
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


  CatDist.prototype.sample = function (n, isOrdered) {
    // TODO
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
        st = this.state;

    // Normalize params
    if (typeof n !== 'number') { n = 1; }
    if (typeof isOrdered !== 'boolean') { isOrdered = false; }

    // Two algorithms to choose from
    if (isOrdered) {
      r = sampleOrdered(this, n);
    } else {

      manyCategories = st.order.length > 30; // 30 is only a guess
      if (manyCategories) {
        r = shuffle(sampleOrdered(this, n));
      } else {
        r = sampleSimple(this, n);
      }
    }
    return r;
  };


  CatDist.prototype.numCategories = function () {
    // Return number of categories in distribution.
    return this.state.order.length;
  };


  CatDist.prototype.dump = function () {
    // Serialize to a shallow array.
    // See also load()

    var i, cat, weight,
        st = this.state,
        result = [];

    // Categories and weights.
    for (i = 0; i < st.order.length; i += 1) {
      cat = st.order[i];
      result.push(cat);
      result.push(st.w[cat]);
    }

    // No need to include sum as it is calculated from the weights.

    return result;
  };


  CatDist.prototype.copy = function () {
    // Return a copy of this distribution.
    // 
    // TODO inefficiently recalculates the wSum
    var cd = new CatDist();
    cd.load(this.dump());
    return cd;
  };


  CatDist.prototype.print = function (precision) {
    // Return human readable string representation of the distribution.
    // 
    // Parameter
    //   precision (optional, default 2)
    // 
    var st = this.state,
        i, cat, prob, probs,
        j, maxCatStrLen = 0;
    var len = st.order.length;
    var result = '';

    if (typeof precision !== 'number') {
      precision = 2;
    }

    // Limit to range [0, 10]
    precision = Math.max(Math.min(precision, 10), 0);
    
    probs = this.prob(st.order);

    // Find padding width
    for (i = 0; i < len; i += 1) {
      cat = st.order[i];
      maxCatStrLen = Math.max(maxCatStrLen, cat.length);
    }

    // Line for each category
    for (i = 0; i < len; i += 1) {
      cat = st.order[i];
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

  CatDist.prototype.learn = function (categories, weight) {
    // Increase the weights of the categories.
    // 
    // Parameter
    //   categories
    //     a single category or an array of categories.
    //     Duplicates are allowed.
    //   weight (optional, default 1)
    //     Amount of weight to add to each category.
    //     Supports also negative weight.
    // 
    // Throws
    //   InvalidWeightException
    //   OverflowException
    // 
    // Return this for chaining.

    var i, st;
    st = this.state;

    if (typeof categories === 'string') {
      categories = [categories];
    }

    if (typeof weight === 'undefined') {
      weight = 1;
    }

    if (typeof weight !== 'number') {
      throw new InvalidWeightException();
    } // else

    // Increase weight
    for (i = 0; i < categories.length; i += 1) {
      learn(this, categories[i], weight);
    }

    return this;
  };
  

  CatDist.prototype.unlearn = function (categories, weight) {
    // Decrease the weights of these categories.
    // Inverse of learn.
    // 
    // Parameter
    //   See learn()
    //
    // Throws
    //   See learn()
    // 
    // Return
    //   See learn()

    if (typeof weight === 'undefined') {
      weight = 1;
    }

    if (typeof weight !== 'number') {
      throw new InvalidWeightException();
    } // else

    return this.learn(categories, -weight);
  };


  CatDist.prototype.dist = function (newDistribution) {
    // Get or set the whole distribution. If newDistribution is omitted,
    // a normalized distribution object is returned. Otherwise $this is
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

    var st, distr, cat,
        newW, newWSum, newOrder, newIndices,
        weight, i;
    st = this.state;

    if (typeof newDistribution === 'undefined') {

      if (st.wSum === 0) {
        // All weights must be 0
        return clone(st.w);
      } // else

      // Return current distribution in normalized form.
      distr = {};
      for (cat in st.w) {
        if (st.w.hasOwnProperty(cat)) {
          distr[cat] = prob(st.w[cat], st.wSum);
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
    newW = {};
    newWSum = 0;
    newOrder = [];
    for (cat in newDistribution) {
      if (newDistribution.hasOwnProperty(cat)) {
        weight = newDistribution[cat];
        if (weight >= 0) {
          newW[cat] = weight;
          newWSum += weight;
          newOrder.push(cat);
        } else {
          throw new InvalidDistributionException();
        }
      }
    }
    // assert all newWeights > 0

    if (isNaN(newWSum) || newWSum === Infinity) {
      throw new InvalidDistributionException();
    }


    // Order the categories
    newOrder.sort(function (a, b) {
      return newW[b] - newW[a];
    });

    // Build indices
    newIndices = {};
    for (i = 0; i < newOrder.length; i += 1) {
      newIndices[newOrder[i]] = i;
    }

    st.w = newW;
    st.wSum = newWSum;
    st.order = newOrder;
    st.indices = newIndices;

    return this;
  };


  CatDist.prototype.load = function (dumpedData) {
    // Load everything from a serialized array.
    // 
    // Precondition
    //   dumped contains weights in probability order, most probable first.
    // 
    // Return this for chaining.

    var i, cat, weight, nextMassSum, s, weightsSum;

    if (dumpedData.length % 2 !== 0) {
      throw new InvalidDumpException();
    }

    // Init
    s = {
      w: {},
      wSum: 0,
      order: [],
      indices: {}
    };

    // Pairs
    for (i = 0; i < dumpedData.length; i += 2) {
      cat = dumpedData[i];
      weight = dumpedData[i + 1];
      s.w[cat] = weight;
      s.wSum += weight;
      s.order.push(cat);
      s.indices[cat] = s.order.length - 1;
    }

    this.state = s;

    return this;
  };
  





  // Customization.
  // Make possible to create plugins that attach methods to the instance.
  // Usage: CategoricalDistribution.extension.myMethod = function (...) {...};
  exports.extension = CatDist.prototype;






  ///////////////
  return exports;

}());


  // Version
  myModule.version = '6.0.0';


  // Make utils visible outside
  myModule.CategoricalDistribution.util = myModule.util;

  // Modules
  if(typeof module === 'object' && typeof module.exports === 'object') {
    // Common JS
    // http://wiki.commonjs.org/wiki/Modules/1.1
    module.exports = myModule.CategoricalDistribution;
  } else {
    // Browsers
    window.CategoricalDistribution = myModule.CategoricalDistribution;
  }
})(this);
