(function(window, UNM) {

  'use strict';

  // private

  function _send(eAddress, eData) {
    UNM.network.send(eAddress, eData);
  }

  // public

  var control = {};

  control.say = function(eSayText, eIsMuted) {
    _send([ 'all', 'say' ], [ eSayText, eIsMuted ]);
  };

  control.type = function(eId, eText) {
    _send([ 'projection', 'type' ], [ "" + eId, eText ]);
  };

  control.trigger = function() {
    _send([ 'all', 'trigger' ]);
  };

  control.reset = function() {
    _send([ 'all', 'reset' ]);
  };

  control.undo = function() {
    _send([ 'all', 'undo' ]);
  };

  UNM.control = control;

})(window, window.UNM);
