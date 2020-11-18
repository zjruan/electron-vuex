"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _electron = require("electron");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var IPC_EVENT_CONNECT = "vuex-mutations-connect";
var IPC_EVENT_CONNECT_REPLY = "vuex-mutations-connect-reply";
var IPC_EVENT_NOTIFY_MAIN = "vuex-mutations-notify-main";
var IPC_EVENT_NOTIFY_RENDERERS = "vuex-mutations-notify-renderers";

// 在 Main 进程中，Main 作为一个 Subject 被监听, Renderer 作为 Observer 【观察者模式】
// 所有的 Renderer 在初始化时，都需要向 Main 发送注册请求
// Main 维护一个 Renderer 的注册列表
// 从而，以 Main 为中心，组成一个 state、mutation 共享网络

var SharedMutations = function () {
  function SharedMutations(options, store) {
    _classCallCheck(this, SharedMutations);

    this.options = options;
    this.store = store;
  }

  _createClass(SharedMutations, [{
    key: "loadOptions",
    value: function loadOptions() {
      if (!this.options.type) this.options.type = process.type === "renderer" ? "renderer" : "main";
      if (!this.options.ipcMain) this.options.ipcMain = _electron.ipcMain;
      if (!this.options.ipcRenderer) this.options.ipcRenderer = _electron.ipcRenderer;
    }
  }, {
    key: "connect",
    value: function connect(payload) {
      return this.options.ipcRenderer.invoke(IPC_EVENT_CONNECT, payload);
    }
  }, {
    key: "onConnect",
    value: function onConnect(handler) {
      this.options.ipcMain.handle(IPC_EVENT_CONNECT, handler);
    }
  }, {
    key: "notifyMain",
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/_regenerator2.default.mark(function _callee(payload) {
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.options.ipcRenderer.invoke(IPC_EVENT_NOTIFY_MAIN, payload);

              case 2:
                return _context.abrupt("return", _context.sent);

              case 3:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function notifyMain(_x) {
        return _ref.apply(this, arguments);
      }

      return notifyMain;
    }()
  }, {
    key: "onNotifyMain",
    value: function onNotifyMain(handler) {
      this.options.ipcMain.handle(IPC_EVENT_NOTIFY_MAIN, handler);
    }
  }, {
    key: "notifyRenderers",
    value: function notifyRenderers(connections, payload) {
      Object.keys(connections).forEach(function (processId) {
        connections[processId].send(IPC_EVENT_NOTIFY_RENDERERS, payload);
      });
    }
  }, {
    key: "onNotifyRenderers",
    value: function onNotifyRenderers(handler) {
      this.options.ipcRenderer.on(IPC_EVENT_NOTIFY_RENDERERS, handler);
    }
  }, {
    key: "rendererProcessLogic",
    value: function rendererProcessLogic() {
      var _this = this;

      // 监听来自主进程的连接回复信息，
      this.options.ipcRenderer.once(IPC_EVENT_CONNECT_REPLY, function (event, mainProcessState) {});
      // Connect renderer to main process
      this.connect().then(function (mainProcessState) {
        console.log('[Electron Vuex]', 'replace Renderer Vuex store from main', mainProcessState);
        _this.store.replaceState(mainProcessState);
      });

      // Save original Vuex methods
      this.store.originalCommit = this.store.commit;
      this.store.originalDispatch = this.store.dispatch;

      // Don't use commit in renderer outside of actions
      this.store.commit = function () {
        throw new Error("[Electron Vuex] Please, don't use direct commit's, use dispatch instead of this.");
      };

      // Forward dispatch to main process
      this.store.dispatch = function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/_regenerator2.default.mark(function _callee2(type, payload) {
          return _regenerator2.default.wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  _context2.next = 2;
                  return _this.notifyMain({ type: type, payload: payload });

                case 2:
                  return _context2.abrupt("return", _context2.sent);

                case 3:
                case "end":
                  return _context2.stop();
              }
            }
          }, _callee2, _this);
        }));

        return function (_x2, _x3) {
          return _ref2.apply(this, arguments);
        };
      }();

      // Subscribe on changes from main process and apply them
      this.onNotifyRenderers(function (event, _ref3) {
        var type = _ref3.type,
            payload = _ref3.payload;

        console.log('[Electron Vuex] ', '接收到 Main Notice： ', { type: type, payload: payload });
        _this.store.originalCommit(type, payload);
      });
    }
  }, {
    key: "mainProcessLogic",
    value: function mainProcessLogic() {
      var _this2 = this;

      var connections = {};

      // Save new connection
      this.onConnect(function () {
        var _ref4 = _asyncToGenerator( /*#__PURE__*/_regenerator2.default.mark(function _callee3(event) {
          var win, winId;
          return _regenerator2.default.wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  win = event.sender;
                  winId = win.id;


                  connections[winId] = win;

                  // Remove connection when window is closed
                  win.on("destroyed", function () {
                    delete connections[winId];
                  });

                  return _context3.abrupt("return", _this2.store.state);

                case 5:
                case "end":
                  return _context3.stop();
              }
            }
          }, _callee3, _this2);
        }));

        return function (_x4) {
          return _ref4.apply(this, arguments);
        };
      }());

      // Subscribe on changes from renderer processes
      this.onNotifyMain(function () {
        var _ref6 = _asyncToGenerator( /*#__PURE__*/_regenerator2.default.mark(function _callee4(event, _ref5) {
          var type = _ref5.type,
              payload = _ref5.payload;
          var result;
          return _regenerator2.default.wrap(function _callee4$(_context4) {
            while (1) {
              switch (_context4.prev = _context4.next) {
                case 0:
                  _context4.next = 2;
                  return _this2.store.dispatch(type, payload);

                case 2:
                  result = _context4.sent;
                  return _context4.abrupt("return", result);

                case 4:
                case "end":
                  return _context4.stop();
              }
            }
          }, _callee4, _this2);
        }));

        return function (_x5, _x6) {
          return _ref6.apply(this, arguments);
        };
      }());

      // Subscribe on changes from Vuex store
      this.store.subscribe(function (mutation) {
        var type = mutation.type,
            payload = mutation.payload;

        // Forward changes to renderer processes

        _this2.notifyRenderers(connections, { type: type, payload: payload });
      });
    }
  }, {
    key: "activatePlugin",
    value: function activatePlugin() {
      switch (this.options.type) {
        case "renderer":
          this.rendererProcessLogic();
          break;
        case "main":
          this.mainProcessLogic();
          break;
        default:
          throw new Error("[Electron Vuex] Type should be \"renderer\" or \"main\".");
      }
    }
  }]);

  return SharedMutations;
}();

exports.default = function () {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return function (store) {
    var sharedMutations = new SharedMutations(options, store);

    sharedMutations.loadOptions();
    sharedMutations.activatePlugin();
  };
};

module.exports = exports.default;