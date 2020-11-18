'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*****************************
* filename: electron vuex
* author: zjruan
* createdate: 20191108
* description:
*   electron 多进程 vuex 共享
* version: 1.0.0
* updatehistory:
* // updater date changeinfo
*/
var _require = require('electron'),
    ipcMain = _require.ipcMain,
    ipcRenderer = _require.ipcRenderer;

var Store = require('electron-store');

var IPC_EVENT_REGISTER = 'IPC_EVENT_REGISTER';
var IPC_EVENT_BROADCAST_MAIN = 'IPC_EVENT_BROADCAST_MAIN';
var IPC_EVENT_BROADCAST_RENDERERS = 'IPC_EVENT_BROADCAST_RENDERERS';

var STORAGE_NAME = 'electron-vuex';
var STORAGE_STATE_KEY = 'electron-vuex-state';
console.log('dfdfd');

var ElectronVuex = function () {
  function ElectronVuex(options, store) {
    _classCallCheck(this, ElectronVuex);

    this.options = options;
    this.store = store;
  }

  _createClass(ElectronVuex, [{
    key: 'init',
    value: function init() {
      throw new Error('[Electron Vuex] Subclass needs to implement "init" method ');
    }
  }]);

  return ElectronVuex;
}();

var ElectronVuexMain = function (_ElectronVuex) {
  _inherits(ElectronVuexMain, _ElectronVuex);

  function ElectronVuexMain(options, store) {
    _classCallCheck(this, ElectronVuexMain);

    var _this = _possibleConstructorReturn(this, (ElectronVuexMain.__proto__ || Object.getPrototypeOf(ElectronVuexMain)).call(this, options, store));

    _this.rendererList = {};
    _this.ipcMain = ipcMain;
    _this.storage = new Store({ name: options.storageName || STORAGE_NAME });
    return _this;
  }
  /**
   * 注册 Renderer 进程
   */


  _createClass(ElectronVuexMain, [{
    key: 'onRegister',
    value: function onRegister() {
      var _this2 = this;

      ipcMain.on(IPC_EVENT_REGISTER, function (event) {
        var rendererWindow = event.sender;
        var rendererId = rendererWindow.id;
        _this2.rendererList[rendererId] = rendererWindow;

        rendererWindow.on('destroyed', function () {
          delete _this2.rendererList[rendererId];
        });

        event.returnValue = _this2.store.state;
      });
    }

    /**
     * 向其他 Renderer 进程广播消息
     * @param {*} exceptRendererId 被排除的 Renderer Windown id
     * @param {*} payload 负载信息
     */

  }, {
    key: 'broadcastRenderers',
    value: function broadcastRenderers(payload) {
      var _this3 = this;

      // console.log('广播消息', Object.keys(this.rendererList), JSON.stringify(payload))

      Object.keys(this.rendererList).forEach(function (windowId) {
        console.log('send bro', windowId, payload.type);
        _this3.rendererList[windowId].send(IPC_EVENT_BROADCAST_RENDERERS, payload);
      });
    }

    /**
     * 监听来自 Renderer 的广播消息
     */

  }, {
    key: 'onBroadcast',
    value: function onBroadcast() {
      var _this4 = this;

      ipcMain.on(IPC_EVENT_BROADCAST_MAIN, function (event, _ref) {
        var type = _ref.type,
            payload = _ref.payload,
            _ref$options = _ref.options,
            options = _ref$options === undefined ? {} : _ref$options;

        console.log('接收到 Renderer 进程的消息', type);

        // if (type === 'LOGIN_SUCCESS') {
        // 如果是登录事件，则在登录成功之后，尝试恢复本地现场
        console.log('用户登录成功');
        if (_this4.options.persisted) {
          try {
            // 用户设置了 数据持久化缓存
            console.log('用户设置了 数据持久化缓存');
            var localState = _this4.storage.get(STORAGE_STATE_KEY);
            if (localState && payload) {
              if (localState.user.liveId == payload.liveId) {
                var _state = Object.assign({}, _this4.store.state, localState);
                _this4.store.replaceState(_state);
                console.log('state 还原成功', JSON.stringify(_state));
              } else {
                console.log('不是同一节直播课');
              }
            }
          } catch (error) {
            console.warn('从本地 local state 恢复 vuex state 出现异常:');
            console.warn(error);
          }
        }
        // }

        // 更新自己数据
        options.fromWind = event.sender.id;
        _this4.store.dispatch(type, payload, options);
      });
    }
  }, {
    key: 'init',
    value: function init() {
      var _this5 = this;

      // 在 Main 进程中，Main 作为一个 Subject 被监听, Renderer 作为 Observer 【观察者模式】
      // 所有的 Renderer 在初始化时，都需要向 Main 发送注册请求
      // Main 维护一个 Renderer 的注册列表
      // 从而，以 Main 为中心，组成一个 state、mutation 共享网络

      this.onRegister();

      this.onBroadcast();

      var timer = null;

      this.store.subscribe(function (mutation, state) {
        var type = mutation.type,
            payload = mutation.payload,
            options = mutation.options;
        // 向其他 Renderer 推送 Action 消息

        _this5.broadcastRenderers({ type: type, payload: payload, options: options });

        if (_this5.options.persisted) {
          try {
            // 添加函数去抖逻辑
            if (!timer) {
              timer = setTimeout(function () {
                timer = null;
                _this5.storage.set(STORAGE_STATE_KEY, state);
              }, 100);
            }
          } catch (error) {
            console.warn(error);
          }
        }
      });

      var localState = this.storage.get(STORAGE_STATE_KEY);
      if (localState && _typeof(localState.settings)) {
        this.store.commit('settings/replaceSettings', localState.settings);
      }
    }
  }]);

  return ElectronVuexMain;
}(ElectronVuex);

var ElectronVuexRenderer = function (_ElectronVuex2) {
  _inherits(ElectronVuexRenderer, _ElectronVuex2);

  function ElectronVuexRenderer() {
    _classCallCheck(this, ElectronVuexRenderer);

    return _possibleConstructorReturn(this, (ElectronVuexRenderer.__proto__ || Object.getPrototypeOf(ElectronVuexRenderer)).apply(this, arguments));
  }

  _createClass(ElectronVuexRenderer, [{
    key: 'register',

    /** 向 Main 注册当前 Renderer 进程 */
    value: function register() {
      var mainState = ipcRenderer.sendSync(IPC_EVENT_REGISTER);
      this.store.replaceState(mainState);
    }
  }, {
    key: 'onBroadcastRenderers',
    value: function onBroadcastRenderers() {
      var _this7 = this;

      ipcRenderer.on(IPC_EVENT_BROADCAST_RENDERERS, function (event, _ref2) {
        var type = _ref2.type,
            payload = _ref2.payload,
            options = _ref2.options,
            windowId = _ref2.windowId;

        _this7.store.originalCommit(type, payload, options);
      });
    }
    /** 向 Main 发送广播消息 */

  }, {
    key: 'broadcast',
    value: function broadcast(payload) {
      ipcRenderer.send(IPC_EVENT_BROADCAST_MAIN, payload);
    }
  }, {
    key: 'init',
    value: function init() {
      var _this8 = this;

      this.register();
      // overwrite Vuex methods
      this.store.originalCommit = this.store.commit;
      this.store.originalDispatch = this.store.dispatch;
      this.store.dispatch = function (type, payload, options) {
        // console.debug('通知主进程', type, payload)

        // if (aliLogger) {
        //   aliLogger.info('action', {
        //     sub_module: type,
        //     content: payload
        //   })
        // }
        _this8.broadcast({ type: type, payload: payload, options: options });
      };
      this.onBroadcastRenderers();
    }
  }]);

  return ElectronVuexRenderer;
}(ElectronVuex);

exports.default = function (electron) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return function (store) {
    ipcMain = electron.ipcMain;
    ipcRenderer = electron.ipcRenderer;
    console.log('Electron Vuex Plugins');
    var electronVuex = process.type === 'renderer' ? new ElectronVuexRenderer(options, store) : new ElectronVuexMain(options, store);
    electronVuex.init();
  };
};

module.exports = exports.default;