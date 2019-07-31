/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 * Watcher 实例解析表达式，收集依赖。
 * 并且表达式的值发生改变时触发依赖。
 * Watcher 也被用于 $watch api 和 指令
 * 
 * 一个 Watcher 实例可以被多个依赖订阅，那么 Watcher 实例需要知道自己被那些依赖订阅，管理自己与依赖之间的关系
 * 
 * 每一个组件都是一个 vue 实例，每一个 vue 实例上都会保存着实例上所有的 Watcher 实例
 */
/**
 * @vm Vue  Vue实例
 * @expression string 表达式（obj.name）
 * @cb Function  依赖函数
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function, // expOrFn 可以是 obj.key 或者 函数
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean // 组件级别的，需要渲染
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this // 将watcher 实例绑定到组件实例上
    }
    //将 Watcher 实例 保存到 组件实例的 _watchers 属性
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb    //依赖回调函数
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // 针对于懒执行的 watcher
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter

    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)  //将一个表达式解析成一个getter函数
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }

    // new Watcher 时执行一下 get 函数，手动触发可侦测数据的 getter，用于依赖收集
    // 如果定义了懒执行，那么先不执行 get 函数
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   * 主要是为了执行 getter ，用以收集依赖
   */
  get () {
    // 设置 window.target，并且将此 watcher 存储在targetStack上
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // 手动触发 可侦测数据的 getter，开始 observer 收集依赖
      // 触发 getter 后，会触发依赖的属性 getter,从而进行依赖收集
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   * 向指令添加一个依赖
   * 
   */
  addDep (dep: Dep) {
    // 拿到依赖管理Dep实例的id
    const id = dep.id
    // 如果没有存储Dep实例的id
    if (!this.newDepIds.has(id)) {
      // 存储Dep实例的id到newDepIds
      this.newDepIds.add(id)
      // 存储Dep实例到newDeps
      this.newDeps.push(dep)
      //如果 依赖 实例没有被收集过，那么收集此依赖
      if (!this.depIds.has(id)) {
        //将 watcher 实例添加到 Dep 实例里面
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   * 清空依赖收集
   */
  cleanupDeps () {
    // 使Dep实例与Watcher实例之间保持一致
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      // 如果 wahcer 实例上的dep
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    // watcher 实例的 depsIDs 与 newDepIds 相互交互，并将 newDepIds 置空
    let tmp = this.depIds
    
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()

    // watcher 实例的 deps 与 newDeps 相互交互，并将 newDeps 置空
    tmp = this.deps

    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   * 执行 watcher 实例的 get 函数，获取值  
   * 仅适用于懒执行的
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      // 将此 watcher 实例收集到所有依赖与他的dep中
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
