(function(window, UNM, Socket, undefined) {

  'use strict';

  var BASE_ADDRESS = 'unm';

  // private

  var _socket;

  var _status, _id;

  var _callback = {
    status: UNM.utils.noop
  };

  function _setStatus(nStatus) {
    _status = nStatus;
    _callback.status(nStatus);
  }

  function _informServer(nAddress, nData) {
    var message;

    message = {
      address: [BASE_ADDRESS].concat(nAddress).join('/'),
      args: []
    };

    if (nData) {
      nData.forEach(function(eArgument) {
        message.args.push(eArgument);
      });
    }

    _socket.send(message);
  }

  // public

  var network = {};

  network.SERVER_ERROR = 1;
  network.SERVER_CONNECTED = 2;
  network.SERVER_DISCONNECTED = 3;
  network.SERVER_WAITING = 4;

  network.initialize = function() {

    _socket = new window.UNM.Socket();

    this.on = _socket.on;
    this.off = _socket.on;

    _socket.on('open', function($event) {
      _setStatus(UNM.network.SERVER_CONNECTED);
    });

    _socket.on('close', function($event) {
      _setStatus(UNM.network.SERVER_DISCONNECTED);
    });

    _socket.on('error', function($event) {
      _setStatus(UNM.network.SERVER_ERROR);
    });

  };

  network.onStatusChange = function(nCallback) {
    if (! nCallback || typeof nCallback !== 'function') {
      return false;
    }
    _callback.status = nCallback;
    return true;
  };

  network.connect = function(nId, nAddress, nPort) {

    if (typeof nId !== 'number' || ! nAddress || ! nPort) {
      return false;
    }

    if (_status === UNM.network.SERVER_CONNECTED || _status === UNM.network.SERVER_WAITING) {
      return false;
    }

    _setStatus(UNM.network.SERVER_WAITING);

    _id = nId;
    _socket.connect(nAddress, nPort);

    return true;

  };

  network.disconnect = function() {

    if (_status === UNM.network.SERVER_DISCONNECTED) {
      return false;
    }

    _socket.disconnect();

    return true;

  };

  network.isConnected = function() {
    return _status === UNM.network.SERVER_CONNECTED;
  };

  network.send = function(nAddress, nData) {
    _informServer(nAddress, nData);
  };

  UNM.network = UNM.network || network;

})(window, window.UNM);
