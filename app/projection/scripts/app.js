(function(window, $, UNM) {

  'use strict';

  // private

  var _id, _listeners, _isRemote;

  function _register() {
    _listeners.image = function($event) {
      UNM.projection.image($event.args[0], $event.args[1]);
    };

    UNM.network.on('/unm/projection/' + _id + '/image', _listeners.image);

    _listeners.video = function($event) {
      UNM.projection.video($event.args[0], $event.args[1]);
    };

    UNM.network.on('/unm/projection/' + _id + '/video', _listeners.video);

    _listeners.type = function($event) {
      UNM.projection.type($event.args[0]);
    };

    UNM.network.on('/unm/projection/' + _id + '/type', _listeners.type);

    _listeners.ask = function($event) {
      UNM.projection.ask($event.args[0]);
    };

    UNM.network.on('/unm/projection/' + _id + '/ask', _listeners.ask);
  }

  function _unregister() {
    UNM.network.off('/unm/projection/' + _id + '/image', _listeners.image);
    UNM.network.off('/unm/projection/' + _id + '/video', _listeners.video);
    UNM.network.off('/unm/projection/' + _id + '/type', _listeners.type);
    UNM.network.off('/unm/projection/' + _id + '/ask', _listeners.ask);
  }

  function _setSettingsDisabled(eDisabledState) {
    $('#server-settings input, #server-settings select').attr('disabled', eDisabledState);
    $('#disconnect').attr('disabled', ! eDisabledState);
    $('#connect').attr('disabled', eDisabledState);
  }

  function _setNetworkStatus(eStatus) {
    if (eStatus === UNM.network.SERVER_ERROR) {
      _setSettingsDisabled(false);
      _unregister();
      $('#network-status').text('An error occurred.');
      if (_isRemote) {
        $('#projection').addClass('warning');
      }
    } else if (eStatus === UNM.network.SERVER_CONNECTED) {
      _setSettingsDisabled(true);
      _register();
      $('#network-status').text('Connected to server.');
      if (_isRemote) {
        $('#projection').removeClass('warning');
      }
    } else if (eStatus === UNM.network.SERVER_DISCONNECTED) {
      _setSettingsDisabled(false);
      _unregister();
      $('#network-status').text('Disconnected.');
      if (_isRemote) {
        $('#projection').addClass('warning');
      }
    } else if (eStatus === UNM.network.SERVER_WAITING) {
      _setSettingsDisabled(true);
      $('#network-status').text('Waiting for connection.');
    }
  }

  function _connect() {
    var address, port;
    address = $('#ws-address').val();
    port = parseInt($('#ws-port').val(), 10);
    UNM.network.connect(_id, address, port);
  }

  // ready

  $(document).ready(function() {
    _listeners = {};
    _isRemote = false;

    // initialize

    UNM.views.initialize();
    UNM.network.initialize();
    UNM.projection.initialize();

    // network events

    UNM.network.onStatusChange(_setNetworkStatus);

    UNM.network.on('/unm/reset', UNM.projection.reset);

    // prepare views

    _setSettingsDisabled(false);

    // get info

    UNM.info.get(function(eServerInfo) {
      var matches;

      // get info from server

      $('#ws-address').val(eServerInfo.address);
      $('#ws-port').val(eServerInfo.port);

      // check auto configuration (remote)

      matches = /auto=([^&#=]*)/.exec(window.location.search);

      if (matches && matches.length > 0) {
        _id = parseInt(matches[0].split('=')[1], 10);
        _connect();
        UNM.projection.mute(true);
        _isRemote = true;
      }
    });

    // settings events

    $('#connect').on('click', function($event) {
      $event.preventDefault();
      _id = parseInt($('#participant-id option:selected').val(), 10);
      UNM.projection.mute($('#muted option:selected').val() == 'yes');
      _connect();
    });

    $('#disconnect').on('click', function($event) {
      $event.preventDefault();
      UNM.network.disconnect();
    });
  });

})(window, window.jQuery, window.UNM);
