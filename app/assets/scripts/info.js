(function(window, $, UNM) {

  'use strict';

  var INFO_ENDPOINT = '/info';

  // public

  var info = {};

  info.get = function(eSuccess) {
    $.ajax(INFO_ENDPOINT, {
      success: function(eResponse) {
        eSuccess(JSON.parse(eResponse));
      }
    });
  };

  UNM.info = info;

})(window, $, UNM);
