/* @flow */

import VNode from '../vnode'
import { createFnInvoker } from './update-listeners'
import { remove, isDef, isUndef, isTrue } from 'shared/util'

// 合并 vnode 的钩子函数
export function mergeVNodeHook (def: Object, hookKey: string, hook: Function) {

  // 如果 def 是 vnode 节点，初始化钩子 hook 
  if (def instanceof VNode) {
    def = def.data.hook || (def.data.hook = {})
  }
  let invoker
  // 获取vnode 上 hookKey 对应的钩子函数，
  // 需要将其与新的钩子函数进行合并操作
  // 钩子函数对应的是一个 invoker
  const oldHook = def[hookKey] 

  function wrappedHook () {
    hook.apply(this, arguments)
    // important: remove merged hook to ensure it's called only once
    // and prevent memory leak
    remove(invoker.fns, wrappedHook)
  }
  
  // 如果 vnode 上原先并没有添加相应的钩子函数，需要初始化创建钩子函数
  if (isUndef(oldHook)) {
    // no existing hook
    invoker = createFnInvoker([wrappedHook]) // [wrappedHook] 保存在 invoker.fs 属性上
  } else {
    /* istanbul ignore if */
    // 如果 vnode 上已经存在创建好的钩子函数并且完成了初始化，那么直接在 invoker.fns 中添加即可
    if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
      // already a merged invoker
      invoker = oldHook
      invoker.fns.push(wrappedHook)
    } else {
      // existing plain hook
      // 有可能 oldHook.fns 已经定义，但是没有值，需要重新创建
      invoker = createFnInvoker([oldHook, wrappedHook])
    }
  }

  invoker.merged = true
  def[hookKey] = invoker
}
