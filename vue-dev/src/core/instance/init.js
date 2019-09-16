/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // 每一个 vue 实例都对应一个全局唯一 uid
    vm._uid = uid++
    let startTag, endTag
    /* 
     * istanbul ignore if 
     * 开发环境下做一些性能监控的处理
     */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // vue._isVue 为 true 可以避免 vue 实例被侦测
    vm._isVue = true
    // merge options
    // 开始对传入的配置项进行合并处理，将相关的属性和方法放到 vue.$options
    if (options && options._isComponent) { // 传入的配置是一个组件实例
      // 内部组件实例化
      // 因为动态配置合并是一个很慢的操作，并且内部组件的配置项不需要特殊处理
      initInternalComponent(vm, options)
    } else { // 普通配置型的合并操作
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }

    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    // 通过 _self 将实例暴漏出去
    vm._self = vm
    // 定义生命周期中一些需要的属性
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    // 执行 beforeCreate 钩子函数
    callHook(vm, 'beforeCreate')
    // 在解析 data/props 前解析 injections; inject 主要为高阶插件/组件库提供用例
    initInjections(vm) // resolve injections before data/props
    // 初始化 state
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    // 执行 created 钩子函数
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) { // 组件是没有挂载容器 el，只有根组件才有 ，如果没有提供了 el ,那么这个实例处于未装载状态，需要手动进行装载
      // $mount 会根据平台在 platforms 下对应的初始文件进行重写
      vm.$mount(vm.$options.el)
    }
  }
}

// 初始化内部组件
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode // 声明组件内容的父 vnode,即组件标签
  opts.parent = options.parent // 声明组件的父 vue 实例
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions // 获取组件 vnode 标签相关的属性，（eg:   { Ctor, propsData, listeners, tag, children }）
  opts.propsData = vnodeComponentOptions.propsData // 获取 propsData
  opts._parentListeners = vnodeComponentOptions.listeners // 获取注册了那些 DOM 事件
  opts._renderChildren = vnodeComponentOptions.children // 有哪些 slot 内容
  opts._componentTag = vnodeComponentOptions.tag // 组件标签名称

  // 如果声明了相关的渲染函数，则使用相关的渲染函数
  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

/**
 * 解析 Vue 构造函数上默认的 config， 并将其返回
 * 如果该构造函数是通过 vue.extend 扩展来的，则需要递归，收集所有的 option
 */
export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super) // 拿到父构造函数的 options
    const cachedSuperOptions = Ctor.superOptions // 拿到子构造函数缓存的父构造函数的 options
    // 将子构造函数创建时缓存的父构造函数的 options 与现在的父构造函数的 options 进行比较，不同的话，则证明发生了改变，需要进行合并处理
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      // 父构造函数的 options 发生改变，子构造函数需要进行相应的更新
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      // 对比那些属性发生了变化，将变化了的属性返回
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      // Ctor.extendOptions 更新修改的属性
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        // 重新指定 options 上对应组件的构造函数
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options // 子构造函数创建时，自身的 extendOptions 与 Super.options 的合并
  const sealed = Ctor.sealedOptions // Sub.options 的一个拷贝
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
