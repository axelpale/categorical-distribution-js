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
