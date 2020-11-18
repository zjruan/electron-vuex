interface SharedMutationsOptions {
  persisted:boolean
}
interface PersistedStateOptions {
  /**
   * 黑名单
   * @description 黑名单中的 mutition 将不会触发保存操作
   */
  whitelist: Array<string>|Function,

  /**
   * 白名单
   * @description 非白名单中的mutation 将不会触发保存操作
   */
  blacklistt: Array<string>|Function,
  /**
   * 仓库名称
   * @description one pc, mutil App use this package, use this field to isolate
   */
  storageName: string,

  /**
   * 延迟时间（单位：ms）
   * @description mutation changed, save state delay time
   */
  delay: number
}
export default interface ElectronVuex {
  createSharedMutations(options: SharedMutationsOptions):Function,
  createPersistedState(options: PersistedStateOptions):Function
}