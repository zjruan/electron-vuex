const Vuex = require( 'vuex')
const vue = require('vue')
vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    count: 0
  },
  mutations: {
    increment (state, payload) {
      state.count++
      console.log(payload)
      return {msg: 'sdfsd'}
    }
  },
  actions: {
    incrementAc({commit}, payload) {
      let com = commit('increment', payload)
      console.log(com)
      return {success: 1}
    }
  }
})

let result = store.dispatch('incrementAc', {id: 100001})
result.then(res => {
  console.log(res)
})
let ev = require('electron-vuex')
ev.printMsg()
