electron-vue project Multi-window state sharing
> electron-vue 项目中，vuex 多窗口 state 共享库

Inspired by [vuex-electron](https://www.npmjs.com/package/vuex-electron)  

灵感来自于 vuex-electron 项目，但是在使用 vuex-electron 的过程中，遇到了一些不可以避免的问题，因此，在  vuex-electron 的基础上，做了一些**很大的**改动，包括部分 state 共享的机制。



相较于 Vuex-Electron, 本项目解决的问题：
* Store 多窗口共享问题  
在没有启用 `persisted-state `的情况下，新建窗口的 State 不是最新的 State 数据，原因是还原 State，新窗口 `replaceState` 依赖 persisted-state 保存的本地文件（vuex.json）
 
 * 存储文件 `vuex.json` 读写权限冲突问题  
 启用 `persisted-state `,在多窗口情况下，会有该问题。原因是，每个窗口都是一个进程，包括主进程，而项目依赖的` electron-store` 库并没有对多进程读写进行处理，当一个窗口正在保存 `state` 的时候，另一个窗口也要保存 `state`，这时候便会产生权限冲突。
 * 巨量` I/O`，导致性能问题  
  启用 `persisted-state `，在高并发/高修改的情况下，会产生大量的 mutation 操作，而项目监听了每一个 mutation 操作，并保存到本地 `state` 存储文件(vuex.json)中，频繁的读写操作，导致巨量的 `I/O` 操作，从而产生性能问题
* Vuex Action 链路中断问题  
我们知道， `store.dispatch('actionName', payload)` 会返回一个 `Promise`， 但是在原项目下，该`Promise` 丢失了。而是时候，我们是需要这个`Promise`去处理一些逻辑的


**Doc Copy Vuex-Electron Project**
---

<p align="center">
  <img width="750" src="https://user-images.githubusercontent.com/678665/45566726-404d9e80-b860-11e8-94b6-527dfcc3b3b3.png">
</p>

# Electron Vuex

The easiest way to share your Vuex Store between all processes (including main).

### Features

:star: Persisted state  
:star: Shared mutations

### Requirements

- [Vue](https://github.com/vuejs/vue) v2.0+
- [Vuex](https://github.com/vuejs/vuex) v2.0+
- [Electron](https://github.com/electron/electron) v2.0+

### Installation

Installation of the Vuex Electron easy as 1-2-3.

1. Install package with using of [yarn](https://github.com/yarnpkg/yarn) or [npm](https://github.com/npm/cli):

    ```
    npm install /electron-vuex
    ```

2. Include plugins in your Vuex store:

    ```javascript
    import Vue from "vue"
    import Vuex from "vuex"

    import { createPersistedState, createSharedMutations } from "electron-vuex"

    Vue.use(Vuex)

    export default new Vuex.Store({
      // ...
      plugins: [
        createPersistedState(),
        createSharedMutations()
      ],
      // ...
    })
    ```

3. In case if you enabled `createSharedMutations()` plugin you need to create an instance of store in the main process. To do it just add this line into your main process (for example `src/main.js`):

    ```javascript
    import './path/to/your/store'
    ```

4. Well done you did it! The last step is to add the star to this repo :smile:

**Usage example: [Vuex Electron Example](https://github.com/electron-vuex-example)**

## IMPORTANT

In renderer process to call actions you need to use `dispatch` or `mapActions`. Don't use `commit` because actions fired via `commit` will not be shared between processes.

### Options

Available options for `createPersistedState()`

```javascript
createPersistedState({
  whitelist: ["whitelistedMutation", "anotherWhitelistedMutation"],

  // or

  whitelist: (mutation) => {
    return true
  },

  // or

  blacklist: ["ignoredMutation", "anotherIgnoredMutation"],

  // or

  blacklist: (mutation) => {
    return true
  },

  // 当同一台机器上，有多个应用使用了此包，此配置用于隔离各应用的 store 存储文件
  storageName: 'your-project-name',

  // store 本地保存节流函数的延迟配置，用于控制 mutation 短时间内大量触发，导致系统I/O爆表的问题，默认：1000ms
  delay: 500
})
```

### Author
zjruan: rzhj@foxmail.com

Reference:
[Vuex-Electron](https://www.npmjs.com/package/vuex-electron)  Andrew Emelianenko  

### License

[MIT License](https://github.com/vue-electron/electron-vuex/blob/master/LICENSE)
