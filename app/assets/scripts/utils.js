(function(window, UNM) {

  'use strict';

  // public

  var utils = {};

  utils.noop = function() {
    return false;
  };

  utils.getTime = function(eSeconds) {
    var sec, min;

    sec = (eSeconds % 60);
    min = Math.floor(eSeconds / 60);

    if (sec < 10) {
      sec = '0' + sec;
    }

    if (min < 10) {
      min = '0' + min;
    }

    return min + ':' + sec;
  };

  UNM.utils = utils;

})(window, UNM);
