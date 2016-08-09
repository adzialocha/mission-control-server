(function(window, $, UNM) {

  'use strict';

  var VIEW_SELECTOR = '.view';

  // private

  var _views;

  function _show(eViewIndex) {
    if (eViewIndex < _views.length) {
      _views.addClass('hidden');
      $(VIEW_SELECTOR + ':nth-child(' + (eViewIndex + 1) + ')').removeClass('hidden');
    }
  }

  // public

  var views = {};

  views.initialize = function() {
    _views = $(VIEW_SELECTOR);
    _show(0);
    $(document).on('keydown', function($event) {
      if ($event.altKey && $event.keyCode >= 49 && $event.keyCode <= 57) {
        $event.preventDefault();
        _show($event.keyCode - 49);
      }
    });
  };

  views.show = function(eViewIndex) {
    _show(eViewIndex);
  };

  UNM.views = views;

})(window, window.jQuery, window.UNM);
