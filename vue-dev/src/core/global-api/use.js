/* @flow */

import { toArray } from '../util/index'

// 安排 vue 的插件
export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    // _installedPlugins 上保存了应用中已经安装了的插件，避免重复安装
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = [])) 
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    const args = toArray(arguments, 1)
    args.unshift(this) // 将  Vue 作为参数

    if (typeof plugin.install === 'function') { // 插件是一个对象，并且提供了 install 方法
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') { // 插件函数直接注册
      plugin.apply(null, args)
    }

    installedPlugins.push(plugin) // 插件收集
    return this 
  }
}
