'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _sharedMutations = require('./shared-mutations');

var _sharedMutations2 = _interopRequireDefault(_sharedMutations);

var _persistedState = require('./persisted-state');

var _persistedState2 = _interopRequireDefault(_persistedState);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import electronVuex from './electron-vuex'
exports.default = {
  createSharedMutations: _sharedMutations2.default,
  createPersistedState: _persistedState2.default
};
module.exports = exports.default;