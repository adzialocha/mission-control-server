(function (window, UNM, undefined) {

  'use strict';

  var FLAGS = {
    SOCKET: {
      IS_NOT_INITALIZED: -1,
      IS_CONNECTING: 0,
      IS_OPEN: 1,
      IS_CLOSING: 2,
      IS_CLOSED: 3
    }
  };

  var _options = {
    discardLateMessages: false
  };

  var DEFAULT_ADDRESS = '127.0.0.1';
  var DEFAULT_PORT = 8000;

  // helpers

  function _isArray(pItem) {
    return Object.prototype.toString.call(pItem) === '[object Array]';
  }

  function _isInteger(pItem) {
    return typeof pItem === 'number' && pItem % 1 === 0;
  }

  function _now() {
    var date = new Date();
    return date.getTime();
  }

  function _prepareAddress(pAddress) {
    var address = '';
    if (typeof pAddress === 'object') {
      address = '/' + pAddress.join('/');
    } else {
      address = pAddress;
      if (address.length > 1 && address[address.length - 1] === '/') {
        address = address.slice(0, address.length - 1);
      }
      if (address.length > 1 && address[0] !== '/') {
        address = '/' + address;
      }
    }
    return address;
  }

  function _prepareRegExPattern(rPattern) {
    var pattern;

    pattern = rPattern.replace(/\./g, '\\.');
    pattern = pattern.replace(/\(/g, '\\(');
    pattern = pattern.replace(/\)/g, '\\)');

    pattern = pattern.replace(/\{/g, '(');
    pattern = pattern.replace(/\}/g, ')');
    pattern = pattern.replace(/\,/g, '|');

    pattern = pattern.replace(/\[\!/g, '[^');

    pattern = pattern.replace(/\?/g, '.');
    pattern = pattern.replace(/\*/g, '.*');

    return pattern;
  }

  /* EncodeHelper
   * util to encode and merge binary data to Int8Array
   */

  var EncodeHelper = function() {
    this.data = [];
    this.length = 0;
  };

  EncodeHelper.prototype.add = function(aItem) {
    var buf = aItem.encode();
    this.length = this.length + buf.length;
    this.data.push(buf);
    return true;
  };

  EncodeHelper.prototype.merge = function() {
    var merged = new Int8Array(this.length);
    var offset = 0;
    this.data.forEach(function(eItem) {
      merged.set(eItem, offset);
      offset = offset + eItem.length;
    });
    return merged;
  };

  /*
   * UNMEventHandler
   * event callback handling
   */

  var UNMEventHandler = function() {

    // callback subscriptions

    this._callbackHandlers = {
      open: [],
      error: [],
      close: []
    };

    this._addressHandlers = {};

    this._uuid = -1;

    return true;

  };

  // subscribe to event

  UNMEventHandler.prototype.on = function(sEventName, sCallback) {
    var token, address, data, regex;

    if (!((typeof sEventName === 'string' || _isArray(sEventName)) &&
        typeof sCallback === 'function')) {
      throw 'UNMEventHandler Error: on expects string/array as eventName and function as callback';
    }

    token = (++this._uuid).toString();
    data = { token: token, callback: sCallback };

    // event listener

    if (typeof sEventName === 'string' && sEventName in this._callbackHandlers) {
      this._callbackHandlers[sEventName].push(data);
      return token;
    }

    // address listener

    address = _prepareAddress(sEventName);

    regex = new RegExp(/[#*\s\[\],\/{}|\?]/g);

    if (regex.test(address.split('/').join(''))) {
      throw 'UNMEventHandler Error: address string contains invalid characters';
    }

    if (! (address in this._addressHandlers)) {
      this._addressHandlers[address] = [];
    }

    this._addressHandlers[address].push(data);

    return token;
  };

  // unsubscribe to event

  UNMEventHandler.prototype.off = function(sEventName, sToken) {
    var key, success, haystack;

    if (!((typeof sEventName === 'string' || _isArray(sEventName)) && sToken)) {
      throw 'UNMEventHandler Error: off expects string/array as eventName and a proper token';
    }

    success = false;

    if (typeof sEventName === 'string' && this._callbackHandlers[sEventName]) {
      haystack = this._callbackHandlers;
      key = sEventName;
    } else {
      key = _prepareAddress(sEventName);
      haystack = this._addressHandlers;
    }

    if (key in haystack) {
      haystack[key].forEach(function(hItem, hIndex) {
        if (hItem.token === sToken) {
          haystack[key].splice(hIndex, 1);
          success = true;
        }
      });
    }

    return success;
  };

  // notify subscribers

  UNMEventHandler.prototype.notify = function(sEventName, sEventData) {
    var _this, addresses, regex, test;

    if (typeof sEventName !== 'string') {
      throw 'UNMEventHandler Error: notify expects a string';
    }

    // notify event subscribers

    if (this._callbackHandlers[sEventName]) {
      this._callbackHandlers[sEventName].forEach(function(cHandlerItem) {
        cHandlerItem.callback(sEventData);
      });
      return true;
    }

    if (sEventName.length === 0 || sEventName[0] !== '/' ) {
      throw 'UNMEventHandler Error: notify expects a proper address starting with /';
    }

    // notify address subscribers

    addresses = Object.keys(this._addressHandlers);
    _this = this;

    addresses.forEach(function(fAddress) {
      regex = new RegExp(_prepareRegExPattern(_prepareAddress(sEventName)), 'g');
      test = regex.test(fAddress);
      if (test && fAddress.length === regex.lastIndex) {
        _this._addressHandlers[fAddress].forEach(function(cHandlerItem) {
          cHandlerItem.callback(sEventData);
        });
      }
    });

    return true;
  };

  // timed notification

  UNMEventHandler.prototype.notifyLater = function(sEventName, sEventData, sTimestamp) {
    var now, _this, data;

    data = sEventData;

    now = _now();

    if (now >= sTimestamp) {
      if (! _options.discardLateMessages) {
        this.notify(sEventName, data);
      }
    } else {
      _this = this;
      window.setTimeout(function() {
        _this.notify(sEventName, data);
      }, sTimestamp - now);
    }

    return true;
  };

  /*
   * UNMSocket
   * holds all UNMSocket handling
   */

  var UNMSocket = function() {
    this._socket = null;
  };

  UNMSocket.prototype.connect = function(sAddress, sPort) {
    if (!( sAddress && sPort)) {
      throw 'UNMSocket Error: missing UNMSocket address or port';
    }
    // setting up UNMSocket

    if (this._socket) {
      this.disconnect();
    }

    this._socket = new WebSocket('ws://' + sAddress + ':' + sPort);

    this._socket.onopen = function(sEvent) {
      _eventHandler.notify('open', sEvent);
    };

    this._socket.onclose = function(sEvent) {
      _eventHandler.notify('close', sEvent);
    };

    this._socket.onerror = function(sEvent) {
      _eventHandler.notify('error', sEvent);
    };

    this._socket.onmessage = function(sEvent) {
      var payload;
      payload = JSON.parse(sEvent.data);
      if ('data' in payload) {
        payload.data.forEach(function(eMessage) {
          _eventHandler.notifyLater(eMessage.address, eMessage, payload.timestamp);
        });
      }
    };

    return true;
  };

  UNMSocket.prototype.disconnect = function() {
    this._socket.close();
    return true;
  };

  UNMSocket.prototype.status = function() {
    if (this._socket) {
      return this._socket.readyState;
    } else {
      return FLAGS.SOCKET.IS_NOT_INITALIZED;
    }
  };

  UNMSocket.prototype.send = function(sData) {
    if (this._socket) {
      if (sData) {
        this._socket.send(sData);
        return true;
      } else {
        return false;
      }
    } else {
      throw 'UNMSocket Error: UNMSocket is not ready to send OSC data';
    }
  };

  var _eventHandler, _socket;

  var Socket = function(mOptions) {

    // set options

    if (mOptions) {
      Object.keys(mOptions).forEach(function(oKey) {
        if (oKey in _options) {
          _options[oKey] = mOptions[oKey];
        }
      });
    }

    // init

    _eventHandler = new UNMEventHandler();
    _socket = new UNMSocket();

    return true;
  };

  // event handling

  Socket.prototype.on = function(sEventName, sCallback) {
    return _eventHandler.on(sEventName, sCallback);
  };

  Socket.prototype.off = function(sEventName, sToken) {
    return _eventHandler.off(sEventName, sToken);
  };

  // socket handling

  Socket.prototype.connect = function(sAddress, sPort) {
    var address = sAddress || DEFAULT_ADDRESS;
    var port = sPort || DEFAULT_PORT;
    return _socket.connect(address, port);
  };

  Socket.prototype.disconnect = function() {
    return _socket.disconnect();
  };

  Socket.prototype.status = function() {
    return _socket.status();
  };

  // sending packets

  Socket.prototype.send = function(sData) {
    return _socket.send(JSON.stringify(sData));
  };

  // public

  Socket.STATUS = FLAGS.SOCKET;

  UNM.Socket = UNM.Socket || Socket;

})(window, window.UNM);
