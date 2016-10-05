'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.withData = withData;
exports.toDOM = toDOM;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _reactDomServer = require('react-dom/server');

var _reactDomServer2 = _interopRequireDefault(_reactDomServer);

var _functions = require('./functions');

function withData(fetch, MaybeComponent, extraContextTypes) {
  function bind(Component) {
    return _react2['default'].createClass({
      contextTypes: (0, _functions.assign)({
        buffer: _react2['default'].PropTypes.object.isRequired
      }, extraContextTypes || {}),

      childContextTypes: {
        buffer: _react2['default'].PropTypes.object.isRequired
      },

      getChildContext: function getChildContext() {
        return { buffer: this.context.buffer };
      },

      componentWillMount: function componentWillMount() {
        if (!this.context.buffer.locked) {
          this.context.buffer.push(fetch(this.props, this.context));
        }
      },

      render: function render() {
        return _react2['default'].createElement(Component, this.props);
      }
    });
  }

  // works as a decorator or as a function
  return MaybeComponent ? bind(MaybeComponent) : function (Component) {
    return bind(Component);
  };
}

function call(f) {
  if (typeof f === 'function') f();
}

function usingDispatchBuffer(buffer, Component) {
  return _react2['default'].createClass({
    childContextTypes: {
      buffer: _react2['default'].PropTypes.object.isRequired
    },

    getChildContext: function getChildContext() {
      return { buffer: buffer };
    },

    render: function render() {
      return _react2['default'].createElement(Component, this.props);
    }
  });
}

var DispatchBuffer = (function () {
  function DispatchBuffer(renderStrategy) {
    _classCallCheck(this, DispatchBuffer);

    this.promisesBuffer = [];
    this.locked = false;
    this.renderStrategy = renderStrategy;
  }

  _createClass(DispatchBuffer, [{
    key: 'push',
    value: function push(v) {
      this.promisesBuffer.push(v);
    }
  }, {
    key: 'fill',
    value: function fill(Element) {
      return this.renderStrategy(Element);
    }
  }, {
    key: 'clear',
    value: function clear() {
      this.promisesBuffer = [];
    }
  }, {
    key: 'flush',
    value: function flush(Element) {
      var _this = this;

      return Promise.all(this.promisesBuffer).then(function (data) {
        // fire off all the actions synchronously
        data.forEach(function (f) {
          if (Array.isArray(f)) {
            f.forEach(call);
          } else {
            call(f);
          }
        });
        _this.locked = true;

        return {
          html: _this.renderStrategy(Element),
          element: Element
        };
      })['catch'](function (err) {
        return Promise.reject({
          err: err,
          element: Element
        });
      });
    }
  }]);

  return DispatchBuffer;
})();

exports.DispatchBuffer = DispatchBuffer;

function getRenderModule() {
  if (typeof window === 'undefined') {
    return _reactDomServer2['default'];
  } else {
    return _reactDom2['default'];
  }
}

function renderWithStrategy(strategy) {
  return function (Component, props) {
    // create a buffer and use context to pass it through to the components
    var buffer = new DispatchBuffer(function (Node) {
      return getRenderModule()[strategy](Node);
    });
    var Container = usingDispatchBuffer(buffer, Component);

    // cache the element
    var Element = _react2['default'].createElement(Container, props);

    // render so we kick things off and get the props
    buffer.fill(Element);

    // flush out the results in the buffer synchronously setting the store
    // state and returning the markup
    return buffer.flush(Element);
  };
}

function toDOM(Component, props, documentNode, shouldLock) {
  var buffer = new DispatchBuffer();
  buffer.locked = !!shouldLock;
  var Node = usingDispatchBuffer(buffer, Component);
  var Element = _react2['default'].createElement(Node, props);
  buffer.clear();
  return getRenderModule().render(Element, documentNode);
}

var toStaticMarkup = renderWithStrategy('renderToStaticMarkup');
exports.toStaticMarkup = toStaticMarkup;
var toString = renderWithStrategy('renderToString');
exports.toString = toString;