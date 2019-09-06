/* @flow */

import { emptyNode } from 'core/vdom/patch'
import { resolveAsset, handleError } from 'core/util/index'
import { mergeVNodeHook } from 'core/vdom/helpers/index'

export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives (vnode: VNodeWithData) {
    updateDirectives(vnode, emptyNode)
  }
}

/** 
 * 进行指令的更新
*/
function updateDirectives (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  // 只要一个节点上存在指令属性，就会进行指令的创建或更新或销毁
  if (oldVnode.data.directives || vnode.data.directives) {
    _update(oldVnode, vnode)
  }
}

function _update (oldVnode, vnode) {
  const isCreate = oldVnode === emptyNode // 如果 oldVnode === emptyNode 现在执行的是指令的初始化过程
  const isDestroy = vnode === emptyNode // 如果 vnode === emptyNode 现在执行的是指令的销毁过程
  // 规范化 vnode 的 directives 形式 （转换成 {}）
  const oldDirs = normalizeDirectives(oldVnode.data.directives, oldVnode.context)
  const newDirs = normalizeDirectives(vnode.data.directives, vnode.context)
  const dirsWithInsert = []
  const dirsWithPostpatch = []

  let key, oldDir, dir
  for (key in newDirs) {
    oldDir = oldDirs[key]
    dir = newDirs[key]
    if (!oldDir) { // 创建过程
      // new directive, bind
      // 创建一个新的指令插入，执行 bind 函数
      callHook(dir, 'bind', vnode, oldVnode)
      if (dir.def && dir.def.inserted) { // 指令的配置中定义了 inserted, inserted 是在被绑定的元素插入到 DOM 中时 执行
        dirsWithInsert.push(dir)
      }
    } else { // 更新过程
      // existing directive, update
      dir.oldValue = oldDir.value
      dir.oldArg = oldDir.arg
      callHook(dir, 'update', vnode, oldVnode)
      if (dir.def && dir.def.componentUpdated) {
        dirsWithPostpatch.push(dir)
      }
    }
  }

  // 将配置了 inserted 的指令挂载到节点的inserted 的钩子函数上，在节点插入 dom 时执行
  if (dirsWithInsert.length) {
    const callInsert = () => {
      for (let i = 0; i < dirsWithInsert.length; i++) {
        callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode)
      }
    }
    if (isCreate) { // 第一次创建过程，将 inserted 函数配置到 vnode 的钩子上
      mergeVNodeHook(vnode, 'insert', callInsert)
    } else { // 如果不是则直接执行
      callInsert()
    }
  }

  // 指令所在组件的 VNode 及其子 VNode 全部更新后调用
  if (dirsWithPostpatch.length) {
    mergeVNodeHook(vnode, 'postpatch', () => {
      for (let i = 0; i < dirsWithPostpatch.length; i++) {
        callHook(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode)
      }
    })
  }

  // 指令与元素解绑时调用
  if (!isCreate) {
    for (key in oldDirs) {
      if (!newDirs[key]) {
        // no longer present, unbind
        callHook(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy)
      }
    }
  }
}

const emptyModifiers = Object.create(null)

function normalizeDirectives (
  dirs: ?Array<VNodeDirective>,
  vm: Component
): { [key: string]: VNodeDirective } {
  const res = Object.create(null)
  if (!dirs) { // 如果不存在指令的话，返回一个空对象
    // $flow-disable-line
    return res
  }

  let i, dir
  for (i = 0; i < dirs.length; i++) {
    dir = dirs[i]
    if (!dir.modifiers) { // 如果不存在使用修饰符，则返回一个空的修饰符对象
      // $flow-disable-line
      dir.modifiers = emptyModifiers
    }
    res[getRawDirName(dir)] = dir
    // 根据具体的指令名称从 config 上获取指令的具体定义
    dir.def = resolveAsset(vm.$options, 'directives', dir.name, true)
  }
  // $flow-disable-line
  // res 是 key/value 形式上，定义这当前 vnode 上所有的指令
  return res
}

// 获取指令的名称
// modifiers 修饰符 v-dir:foo.a.b （foo 是传给指令的参数 a,b 是 修饰符）
function getRawDirName (dir: VNodeDirective): string {
  return dir.rawName || `${dir.name}.${Object.keys(dir.modifiers || {}).join('.')}`
}

// 执行指令的相应的钩子函数，并且传入值
function callHook (dir, hook, vnode, oldVnode, isDestroy) {
  const fn = dir.def && dir.def[hook]
  if (fn) {
    try {
      fn(vnode.elm, dir, vnode, oldVnode, isDestroy)
    } catch (e) {
      handleError(e, vnode.context, `directive ${dir.name} ${hook} hook`)
    }
  }
}
