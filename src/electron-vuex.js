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
let { ipcMain, ipcRenderer } = require('electron');
const Store = require('electron-store')

const IPC_EVENT_REGISTER = 'IPC_EVENT_REGISTER'
const IPC_EVENT_BROADCAST_MAIN = 'IPC_EVENT_BROADCAST_MAIN'
const IPC_EVENT_BROADCAST_RENDERERS = 'IPC_EVENT_BROADCAST_RENDERERS'

const STORAGE_NAME = 'electron-vuex'
const STORAGE_STATE_KEY = 'electron-vuex-state'
console.log('dfdfd');
class ElectronVuex {
  constructor(options, store) {
    this.options = options;
    this.store = store
  }

  init() {
    throw new Error('[Electron Vuex] Subclass needs to implement "init" method ')
  }
}

class ElectronVuexMain extends ElectronVuex {
  constructor(options, store) {
    super(options, store)
    this.rendererList = {}
    this.ipcMain = ipcMain
    this.storage = new Store({ name: options.storageName || STORAGE_NAME })
  }
  /**
   * 注册 Renderer 进程
   */
  onRegister() {
    ipcMain.on(IPC_EVENT_REGISTER, (event) => {
      let rendererWindow = event.sender
      let rendererId = rendererWindow.id
      this.rendererList[rendererId] = rendererWindow

      rendererWindow.on('destroyed', () => {
        delete this.rendererList[rendererId]
      })

      event.returnValue = this.store.state
    })
  }

  /**
   * 向其他 Renderer 进程广播消息
   * @param {*} exceptRendererId 被排除的 Renderer Windown id
   * @param {*} payload 负载信息
   */
  broadcastRenderers(payload) {
    // console.log('广播消息', Object.keys(this.rendererList), JSON.stringify(payload))

    Object.keys(this.rendererList).forEach((windowId) => {
      console.log('send bro', windowId, payload.type)
      this.rendererList[windowId].send(IPC_EVENT_BROADCAST_RENDERERS, payload)
    })
  }

  /**
   * 监听来自 Renderer 的广播消息
   */
  onBroadcast () {
    ipcMain.on(IPC_EVENT_BROADCAST_MAIN, (event, {type, payload, options = {}}) => {
      console.log('接收到 Renderer 进程的消息', type)

      // if (type === 'LOGIN_SUCCESS') {
        // 如果是登录事件，则在登录成功之后，尝试恢复本地现场
        console.log('用户登录成功')
        if (this.options.persisted) {
          try {
            // 用户设置了 数据持久化缓存
            console.log('用户设置了 数据持久化缓存')
            let localState = this.storage.get(STORAGE_STATE_KEY)
            if (localState && payload) {
              if (localState.user.liveId == payload.liveId) {
                let _state = Object.assign({}, this.store.state, localState)
                this.store.replaceState(_state)
                console.log('state 还原成功', JSON.stringify(_state))
              } else {
                console.log('不是同一节直播课')
              }
            }
          } catch (error) {
            console.warn('从本地 local state 恢复 vuex state 出现异常:')
            console.warn(error)
          }
        }
      // }

      // 更新自己数据
      options.fromWind = event.sender.id
      this.store.dispatch(type, payload, options)
    })
  }

  init() {
    // 在 Main 进程中，Main 作为一个 Subject 被监听, Renderer 作为 Observer 【观察者模式】
    // 所有的 Renderer 在初始化时，都需要向 Main 发送注册请求
    // Main 维护一个 Renderer 的注册列表
    // 从而，以 Main 为中心，组成一个 state、mutation 共享网络

    this.onRegister()

    this.onBroadcast()

    var timer = null

    this.store.subscribe((mutation, state) => {
      const { type, payload, options } = mutation
      // 向其他 Renderer 推送 Action 消息
      this.broadcastRenderers({type, payload, options})

      if (this.options.persisted) {
        try {
          // 添加函数去抖逻辑
          if (!timer) {
            timer = setTimeout(() => {
              timer = null
              this.storage.set(STORAGE_STATE_KEY, state)
            }, 100)
          }
        } catch (error) {
          console.warn(error)
        }
      }
    })

    let localState = this.storage.get(STORAGE_STATE_KEY)
    if (localState && typeof localState.settings) {
      this.store.commit('settings/replaceSettings', localState.settings)
    }
  }
}

class ElectronVuexRenderer extends ElectronVuex {
  /** 向 Main 注册当前 Renderer 进程 */
  register() {
    let mainState = ipcRenderer.sendSync(IPC_EVENT_REGISTER)
    this.store.replaceState(mainState)
  }

  onBroadcastRenderers() {
    ipcRenderer.on(IPC_EVENT_BROADCAST_RENDERERS, (event, {type, payload, options, windowId}) => {
      this.store.originalCommit(type, payload, options)
    })
  }
  /** 向 Main 发送广播消息 */
  broadcast(payload) {
    ipcRenderer.send(IPC_EVENT_BROADCAST_MAIN, payload)
  }

  init() {
    this.register()
    // overwrite Vuex methods
    this.store.originalCommit = this.store.commit
    this.store.originalDispatch = this.store.dispatch
    this.store.dispatch = (type, payload, options) => {
      // console.debug('通知主进程', type, payload)

      // if (aliLogger) {
      //   aliLogger.info('action', {
      //     sub_module: type,
      //     content: payload
      //   })
      // }
      this.broadcast({type, payload, options});
    }
    this.onBroadcastRenderers()
  }
}

export default (electron, options = {}) => (store) => {
  ipcMain = electron.ipcMain
  ipcRenderer = electron.ipcRenderer
  console.log('Electron Vuex Plugins')
  let electronVuex = process.type === 'renderer' ? new ElectronVuexRenderer(options, store) : new ElectronVuexMain(options, store);
  electronVuex.init()
}
