(function(window, $, UNM) {

  'use strict';

  var PROJECTION_PORT = 4000;

  // private

  var _debounced, _id;

  var _isTimeActive, _time, _timeScene;

  function _setSettingsDisabled(eDisabledState) {
    $('#server-settings input, #server-settings select').attr('disabled', eDisabledState);
    $('#disconnect').attr('disabled', ! eDisabledState);
    $('#connect').attr('disabled', eDisabledState);
  }

  function _setNetworkStatus(eStatus) {
    if (eStatus === UNM.network.SERVER_ERROR) {
      _setSettingsDisabled(false);
      $('#network-status').text('An error occurred.');
      $('.header').addClass('warning');
    } else if (eStatus === UNM.network.SERVER_CONNECTED) {
      _setSettingsDisabled(true);
      $('#network-status').text('Connected to server.');
      $('.header').removeClass('warning');
    } else if (eStatus === UNM.network.SERVER_DISCONNECTED) {
      _setSettingsDisabled(false);
      $('#network-status').text('Disconnected.');
      $('.header').addClass('warning');
    } else if (eStatus === UNM.network.SERVER_WAITING) {
      _setSettingsDisabled(true);
      $('#network-status').text('Waiting for connection.');
      $('.header').addClass('warning');
    }
  }

  function _flash(eMessage) {
    var message;
    message = eMessage || 'TRIGGER';
    $('#trigger').html(message);
    $('#trigger').removeClass('visible');
    window.setTimeout(function() {
      $('#trigger').addClass('visible');
    }, 1);
    window.setTimeout(function() {
      $('#trigger').removeClass('visible');
    }, 100);
  }

  function _updateTimer() {
    if (! _isTimeActive) {
      return false;
    }

    _timeScene++;
    _time++;

    $('#current-time').html(UNM.utils.getTime(_time));
    $('#current-scene-time').html(UNM.utils.getTime(_timeScene));
  }

  function _startTimer() {
    _timeScene = -1;

    if (! _isTimeActive) {
      _time = -1;
      _isTimeActive = true;
    }

    _updateTimer();
  }

  function _trigger() {
    UNM.control.trigger();
  }

  function _say() {
    var message;
    message = $('#say-text').val();
    if (UNM.network.isConnected() && message.length > 0) {
      UNM.control.say(message, document.getElementById('say-muted').checked);
    }
    $('#say-text').val('');
  }

  function _type() {
    if (UNM.network.isConnected()) {
      UNM.control.type(_id, $('#say-text').val());
    }
  }

  // ready

  $(document).ready(function() {
    UNM.views.initialize();
    UNM.pdf.initialize();

    UNM.info.get(function(eServerInfo) {
      $('#ws-address').val(eServerInfo.address);
      $('#ws-port').val(eServerInfo.port);

      eServerInfo.pdfs.forEach(function(eItem) {
        $('#pdf-selector').append('<option value="' + eItem + '">' + eItem + '</option>');
      });

      // prepare preview screens

      $('.projection').each(function(eIndex) {
        $(this).attr('src', 'http://' + $('#ws-address').val() + ':' + PROJECTION_PORT + '?auto=' + eIndex);
      });
    });

    UNM.network.initialize();

    // start timer

    _isTimeActive = false;

    window.setInterval(_updateTimer, 1000);

    // prepare views

    _setSettingsDisabled(false);

    // network events

    UNM.network.onStatusChange(_setNetworkStatus);

    // settings events

    $('#connect').on('click', function($event) {
      var address, port;
      $event.preventDefault();
      _id = parseInt($('#participant-id option:selected').val(), 10);
      address = $('#ws-address').val();
      port = parseInt($('#ws-port').val(), 10);
      UNM.network.connect(_id, address, port);
    });

    $('#disconnect').on('click', function($event) {
      $event.preventDefault();
      UNM.network.disconnect();
    });

    $('#load-pdf').on('click', function($event) {
      $event.preventDefault();
      $('#load-pdf-file').trigger('click');
    });

    $('#pdf-selector').on('change', function($event) {
      var path;
      path = $('#pdf-selector option:selected').val();
      if (path) {
        $('.pdf-view').addClass('visible');
        UNM.pdf.load(path);
      } else {
        $('.pdf-view').removeClass('visible');
      }
    });

    // socket events

    UNM.network.on('/unm/control/info', function(eData) {
      $('#current-scene').html(eData.args[0]);
      $('#next-scene').html('NEXT: ' + eData.args[1]);
      _startTimer();
    });

    UNM.network.on('/unm/reset', function() {
      $('#current-time, #current-scene-time').html('');

      _isTimeActive = false;
    });

    // control events

    _debounced = true;

    $(document).on('keyup', function() {
      _debounced = true;
    });

    $(document).on('keydown', function($event) {
      // reset

      if ($event.keyCode === 48 && $event.altKey) {
        $event.preventDefault();
        if (UNM.network.isConnected()) {
          UNM.control.reset();
          _flash('RESET');
        }
        return true;
      }

      if (! _debounced) {
        return true;
      }

      _debounced = false;

      // undo

      if ($event.keyCode === 27 && $event.altKey) {
        $event.preventDefault();
        if (UNM.network.isConnected()) {
          UNM.control.undo();
          _flash('UNDO');
        }
        return true;
      }

      // trigger

      if ($event.keyCode === 27) {
        $event.preventDefault();
        if (UNM.network.isConnected()) {
          _trigger();
          _flash();
        }
        return true;
      }

      // next / previous pdf

      if ($event.keyCode === 39) {
        $event.preventDefault();
        UNM.pdf.next();
        return true;
      } else if ($event.keyCode === 37) {
        $event.preventDefault();
        UNM.pdf.previous();
        return true;
      }

      // say trigger

      if ($event.keyCode === 13) {
        if (UNM.network.isConnected()) {
          $event.preventDefault();
          _say();
          _type();
          _flash('SAY');
          return true;
        }
      }
    });

    $('#say-text').on('input', function() {
      if (UNM.network.isConnected()) {
        _type();
        _flash('TYPE');
      }
    });

    $('#say-muted').on('click', function() {
      var str;
      str = 'SAY';
      if (document.getElementById('say-muted').checked) {
        str += ' (MUTED)';
      }
      $('#say-title').html(str);
    });
  });

})(window, window.jQuery, window.UNM);
