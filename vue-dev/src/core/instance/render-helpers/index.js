/* @flow */

import { toNumber, toString, looseEqual, looseIndexOf } from 'shared/util'
import { createTextVNode, createEmptyVNode } from 'core/vdom/vnode'
import { renderList } from './render-list'
import { renderSlot } from './render-slot'
import { resolveFilter } from './resolve-filter'
import { checkKeyCodes } from './check-keycodes'
import { bindObjectProps } from './bind-object-props'
import { renderStatic, markOnce } from './render-static'
import { bindObjectListeners } from './bind-object-listeners'
import { resolveScopedSlots } from './resolve-scoped-slots'
import { bindDynamicKeys, prependModifier } from './bind-dynamic-keys'

export function installRenderHelpers (target: any) {
  target._o = markOnce // 生成 v-once 节点
  target._n = toNumber // 生成数字
  target._s = toString // Object.prototype.toString
  target._l = renderList // 生成 v-for 节点
  target._t = renderSlot 
  target._q = looseEqual
  target._i = looseIndexOf
  target._m = renderStatic // 生成静态节点
  target._f = resolveFilter // 解析筛选器 filter 根据筛选器的名称，获取 options.filter 上对应的函数，然后将参数传进去执行
  target._k = checkKeyCodes
  target._b = bindObjectProps
  target._v = createTextVNode // 生成文本节点
  target._e = createEmptyVNode // 生成空节点
  target._u = resolveScopedSlots // 生成 scopedSlots 节点
  target._g = bindObjectListeners // 
  target._d = bindDynamicKeys
  target._p = prependModifier
}
