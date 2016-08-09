(function(window, UNM, $) {

  'use strict';

  var SCREEN_MODES = [
    'image',
    'video'
  ];

  var ASK_FADE_DELAY = 2500;
  var VIDEO_PLAY_DELAY = 50;

  var IMAGES_FOLDER = 'images';
  var VIDEOS_FOLDER = 'videos';

  var _isImage, _isVideo;

  var _timeout;

  // private

  function _set(eNewMode) {
    SCREEN_MODES.forEach(function(eMode) {
      $('#projection').removeClass(eMode + '-mode');
    });
    $('#projection').addClass(eNewMode + '-mode');
  }

  function _preloadImage(eImageFileName) {
    var img;
    img = new Image();
    img.src = IMAGES_FOLDER + '/' + eImageFileName;
  }

  function _startImage(eImageFileName) {
    var img, path;

    path = IMAGES_FOLDER + '/' + eImageFileName;

    img = new Image();

    img.onload = function() {
      $('#image').css('background-image', 'url("' + path + '")');
    };

    img.src = path;
    _isImage = true;
  }

  function _stopImage() {
    $('#image').css('background-image', '');
    _isImage = false;
  }

  function _preloadVideo(eVideoFileName) {
    $('#cache-video').attr('src', VIDEOS_FOLDER + '/' + eVideoFileName);
    $('#cache-video').get(0).play();
  }

  function _startVideo(eVideoFileName) {
    $('#video').attr('src', VIDEOS_FOLDER + '/' + eVideoFileName);
    $('#video').get(0).pause();
    window.setTimeout(function () {
      if ($('#video').get(0).paused) {
        $('#video').get(0).play();
      }
    }, VIDEO_PLAY_DELAY);
    _isVideo = true;
  }

  function _stopVideo() {
    $('#video').get(0).pause();
    _isVideo = false;
  }

  function _stopRunningVisualMedia(eIsNextImage) {
    if (_isVideo) {
      _stopVideo();
    }
    if (_isImage && ! eIsNextImage) {
      _stopImage();
    }
  }

  // public

  var projection = {};

  projection.initialize = function() {
    $('#video').on('play', function() {
      $('#video').addClass('playing');
    });

    $('#video').on('pause', function() {
      $('#video').removeClass('playing');
    });

    $('.projection-type').addClass('inactive');
    $('.projection-ask').addClass('inactive');
  };

  projection.image = function(eImageFileName, eIsForCacheWarming) {
    _stopRunningVisualMedia(true);
    _set('image');
    _startImage(eImageFileName);
    // if (! eIsForCacheWarming) {
    //   _stopRunningVisualMedia(true);
    //   _set('image');
    //   _startImage(eImageFileName);
    // } else {
    //   _preloadImage(eImageFileName);
    // }
  };

  projection.video = function(eVideoFileName, eIsForCacheWarming) {
    _stopRunningVisualMedia();
    _set('video');
    _startVideo(eVideoFileName);
    // if (! eIsForCacheWarming) {
    //   _stopRunningVisualMedia();
    //   _set('video');
    //   _startVideo(eVideoFileName);
    // } else {
    //   _preloadVideo(eVideoFileName);
    // }
  };

  projection.type = function(eText) {
    if (! eText || eText.length === 0) {
      $('.projection-type').addClass('inactive');
    } else {
      $('.projection-type').removeClass('inactive');
      $('.projection-type').html(eText);
    }
  };

  projection.ask = function(eText) {
    $('.projection-ask').removeClass('inactive');
    $('.projection-ask').html($('.projection-ask').html() + '<br>' + eText);
    if (_timeout) {
      window.clearTimeout(_timeout);
    }
    _timeout = window.setTimeout(function() {
      $('.projection-ask').addClass('inactive');
    }, ASK_FADE_DELAY);
  };

  projection.mute = function(eStatus) {
    if (eStatus) {
      $('#video').attr('muted', '');
    } else {
      $('#video').removeAttr('muted');
    }
  };

  projection.reset = function() {
    _stopRunningVisualMedia();

    $('.projection-ask').html('');
    $('.projection-type').html('');
  };

  UNM.projection = projection;

})(window, window.UNM, window.jQuery);
