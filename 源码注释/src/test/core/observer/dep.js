/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * 依赖管理模块
 * 收集的依赖（window.target）是 Watcher 实例
 * 所有的依赖函数都存放在 Watcher 实例里， Dep 实例里收集的都是 Watcher 实例
 * 每个依赖都有自己唯一的 ID 标识
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++     //每个 Dep 实例都有自己的唯一 id 标识
    this.subs = []      //存储依赖watcher的地方
  }
  /**
   * 添加依赖
   * @sub Watcher
   */
  addSub (sub: Watcher) { 
    this.subs.push(sub)
  }
  /**
   * 去除某个指定的依赖
   */
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {
      // 通过 watcher 实例添加依赖
      Dep.target.addDep(this)
    }
  }
  /**
   * 通知依赖进行更新
   */
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    //调用 watcher 实例的更新方法
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack = []

export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
