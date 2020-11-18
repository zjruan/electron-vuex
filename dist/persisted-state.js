"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _deepmerge = require("deepmerge");

var _deepmerge2 = _interopRequireDefault(_deepmerge);

var _electronStore = require("electron-store");

var _electronStore2 = _interopRequireDefault(_electronStore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var STORAGE_NAME = "vuex";
var STORAGE_KEY = "state";
var STORAGE_TEST_KEY = "test";

var PersistedState = function () {
  function PersistedState(options, store) {
    _classCallCheck(this, PersistedState);

    this.options = options;
    this.store = store;
  }

  _createClass(PersistedState, [{
    key: "loadOptions",
    value: function loadOptions() {
      if (!this.options.storage) this.options.storage = this.createStorage();
      if (!this.options.storageKey) this.options.storageKey = STORAGE_KEY;

      this.whitelist = this.loadFilter(this.options.whitelist, "whitelist");
      this.blacklist = this.loadFilter(this.options.blacklist, "blacklist");
    }
  }, {
    key: "createStorage",
    value: function createStorage() {
      return new _electronStore2.default({ name: this.options.storageName || STORAGE_NAME });
    }
  }, {
    key: "getState",
    value: function getState() {
      return this.options.storage.get(this.options.storageKey);
    }
  }, {
    key: "setState",
    value: function setState(state) {
      this.options.storage.set(this.options.storageKey, state);
    }
  }, {
    key: "loadFilter",
    value: function loadFilter(filter, name) {
      if (!filter) {
        return null;
      } else if (filter instanceof Array) {
        return this.filterInArray(filter);
      } else if (typeof filter === "function") {
        return filter;
      } else {
        throw new Error("[Vuex Electron] Filter \"" + name + "\" should be Array or Function. Please, read the docs.");
      }
    }
  }, {
    key: "filterInArray",
    value: function filterInArray(list) {
      return function (mutation) {
        return list.includes(mutation.type);
      };
    }
  }, {
    key: "checkStorage",
    value: function checkStorage() {
      try {
        this.options.storage.set(STORAGE_TEST_KEY, STORAGE_TEST_KEY);
        this.options.storage.get(STORAGE_TEST_KEY);
        this.options.storage.delete(STORAGE_TEST_KEY);
      } catch (error) {
        throw new Error("[Vuex Electron] Storage is not valid. Please, read the docs.");
      }
    }
  }, {
    key: "combineMerge",
    value: function combineMerge(target, source, options) {
      var emptyTarget = function emptyTarget(value) {
        return Array.isArray(value) ? [] : {};
      };
      var clone = function clone(value, options) {
        return (0, _deepmerge2.default)(emptyTarget(value), value, options);
      };
      var destination = target.slice();

      source.forEach(function (e, i) {
        if (typeof destination[i] === "undefined") {
          var cloneRequested = options.clone !== false;
          var shouldClone = cloneRequested && options.isMergeableObject(e);
          destination[i] = shouldClone ? clone(e, options) : e;
        } else if (options.isMergeableObject(e)) {
          destination[i] = (0, _deepmerge2.default)(target[i], e, options);
        } else if (target.indexOf(e) === -1) {
          destination.push(e);
        }
      });

      return destination;
    }
  }, {
    key: "loadInitialState",
    value: function loadInitialState() {
      var state = this.getState(this.options.storage, this.options.storageKey);

      if (state) {
        var mergedState = (0, _deepmerge2.default)(this.store.state, state, { arrayMerge: this.combineMerge });
        this.store.replaceState(mergedState);
      }
    }
  }, {
    key: "subscribeOnChanges",
    value: function subscribeOnChanges() {
      var _this = this;

      // 添加函数节流，防止高并发时导致高IO操作
      var timer = null;
      var delay = this.options.delay;

      this.store.subscribe(function (mutation, state) {
        if (_this.blacklist && _this.blacklist(mutation)) return;
        if (_this.whitelist && !_this.whitelist(mutation)) return;
        if (timer) return;

        timer = setTimeout(function () {
          timer = null;
          _this.setState(state);
        }, delay);
      });
    }
  }]);

  return PersistedState;
}();

exports.default = function () {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return function (store) {
    var persistedState = new PersistedState(options, store);

    persistedState.loadOptions();
    persistedState.checkStorage();
    persistedState.loadInitialState();
    persistedState.subscribeOnChanges();
  };
};

module.exports = exports.default;