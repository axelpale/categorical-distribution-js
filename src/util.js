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