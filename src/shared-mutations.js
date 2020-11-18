import { ipcMain, ipcRenderer } from "electron"

const IPC_EVENT_CONNECT = "vuex-mutations-connect"
const IPC_EVENT_CONNECT_REPLY = "vuex-mutations-connect-reply"
const IPC_EVENT_NOTIFY_MAIN = "vuex-mutations-notify-main"
const IPC_EVENT_NOTIFY_RENDERERS = "vuex-mutations-notify-renderers"

// 在 Main 进程中，Main 作为一个 Subject 被监听, Renderer 作为 Observer 【观察者模式】
// 所有的 Renderer 在初始化时，都需要向 Main 发送注册请求
// Main 维护一个 Renderer 的注册列表
// 从而，以 Main 为中心，组成一个 state、mutation 共享网络

class SharedMutations {
  constructor(options, store) {
    this.options = options
    this.store = store
  }

  loadOptions() {
    if (!this.options.type) this.options.type = process.type === "renderer" ? "renderer" : "main"
    if (!this.options.ipcMain) this.options.ipcMain = ipcMain
    if (!this.options.ipcRenderer) this.options.ipcRenderer = ipcRenderer
  }

  connect(payload) {
    return this.options.ipcRenderer.invoke(IPC_EVENT_CONNECT, payload)
  }

  onConnect(handler) {
    this.options.ipcMain.handle(IPC_EVENT_CONNECT, handler)
  }

  async notifyMain(payload) {
    return await this.options.ipcRenderer.invoke(IPC_EVENT_NOTIFY_MAIN, payload)
  }

  onNotifyMain(handler) {
    this.options.ipcMain.handle(IPC_EVENT_NOTIFY_MAIN, handler)
  }

  notifyRenderers(connections, payload) {
    Object.keys(connections).forEach((processId) => {
      connections[processId].send(IPC_EVENT_NOTIFY_RENDERERS, payload)
    })
  }

  onNotifyRenderers(handler) {
    this.options.ipcRenderer.on(IPC_EVENT_NOTIFY_RENDERERS, handler)
  }

  rendererProcessLogic() {
    // 监听来自主进程的连接回复信息，
    this.options.ipcRenderer.once(IPC_EVENT_CONNECT_REPLY, (event, mainProcessState) => {

    })
    // Connect renderer to main process
    this.connect().then((mainProcessState) => {
      console.log('[Electron Vuex]', 'replace Renderer Vuex store from main', mainProcessState)
      this.store.replaceState(mainProcessState)
    })

    // Save original Vuex methods
    this.store.originalCommit = this.store.commit
    this.store.originalDispatch = this.store.dispatch

    // Don't use commit in renderer outside of actions
    this.store.commit = () => {
      throw new Error(`[Electron Vuex] Please, don't use direct commit's, use dispatch instead of this.`)
    }

    // Forward dispatch to main process
    this.store.dispatch = async (type, payload) => {
      return await this.notifyMain({ type, payload })
    }

    // Subscribe on changes from main process and apply them
    this.onNotifyRenderers((event, { type, payload }) => {
      console.log('[Electron Vuex] ', '接收到 Main Notice： ', { type, payload })
      this.store.originalCommit(type, payload)
    })
  }

  mainProcessLogic() {
    const connections = {}

    // Save new connection
    this.onConnect(async (event) => {
      const win = event.sender
      const winId = win.id

      connections[winId] = win

      // Remove connection when window is closed
      win.on("destroyed", () => {
        delete connections[winId]
      })

      return this.store.state;
    })

    // Subscribe on changes from renderer processes
    this.onNotifyMain(async (event, { type, payload }) => {
       let result = await this.store.dispatch(type, payload)
      return result
    })

    // Subscribe on changes from Vuex store
    this.store.subscribe((mutation) => {
      const { type, payload } = mutation

      // Forward changes to renderer processes
      this.notifyRenderers(connections, { type, payload })
    })
  }

  activatePlugin() {
    switch (this.options.type) {
      case "renderer":
        this.rendererProcessLogic()
        break
      case "main":
        this.mainProcessLogic()
        break
      default:
        throw new Error(`[Electron Vuex] Type should be "renderer" or "main".`)
    }
  }
}

export default (options = {}) => (store) => {
  const sharedMutations = new SharedMutations(options, store)

  sharedMutations.loadOptions()
  sharedMutations.activatePlugin()
}
