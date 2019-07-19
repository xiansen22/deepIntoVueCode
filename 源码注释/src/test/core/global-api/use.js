/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    // 定义已经装载的插件或指令
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    // 如果此插件或者指令已经装在则，不进行相关处理
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    // 将第一个参数去除，剩余的转换成真正的数组，传给plugin的install
    const args = toArray(arguments, 1)
    args.unshift(this)
    
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    // 将插件推入installedPlugins记录下来
    installedPlugins.push(plugin)
    return this
  }
}
