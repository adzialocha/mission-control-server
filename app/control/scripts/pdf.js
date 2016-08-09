(function(window, UNM, PDFJS) {

  'use strict';

  var WORKER_PATH = '/pdfjs-dist/build/pdf.worker.js';
  var SCALE = 3;

  // private

  var _document, _page, _current;
  var _isRendering;

  function _show(ePageIndex) {
    if (! _document || _isRendering || ePageIndex === _current) {
      return false;
    }

    _current = ePageIndex;

    _document.getPage(ePageIndex).then(function(ePdfPage) {
      var viewport, canvas, context, render;

      viewport = ePdfPage.getViewport(SCALE);
      canvas = document.getElementById('pdf-view');
      context = canvas.getContext('2d');

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      render = ePdfPage.render({
        canvasContext: context,
        viewport: viewport
      });

      _isRendering = true;

      render.promise.then(function () {
        _isRendering = false;
      });
    });
  }

  // public

  var pdf = {};

  pdf.initialize = function() {
    PDFJS.disableWorker = false;
    PDFJS.workerSrc = WORKER_PATH;
  };

  pdf.load = function(eFilePath) {
    PDFJS.getDocument('./' + eFilePath).then(function getPdfHelloWorld(ePdfDocument) {
      _document = ePdfDocument;
      _page = 1;
      _show(_page)
    });
  };

  pdf.next = function() {
    if (! _document) {
      return false;
    }
    _page++;
    if (_page > _document.numPages) {
      _page = _document.numPages;
    }
    _show(_page);
  };

  pdf.previous = function() {
    if (! _document) {
      return false;
    }
    _page--;
    if (_page < 1) {
      _page = 1;
    }
    _show(_page);
  };


  UNM.pdf = pdf;

})(window, window.UNM, window.PDFJS);
