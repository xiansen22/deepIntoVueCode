/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools,
  inBrowser,
  isIE
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
let has: { [key: number]: ?true } = {}
let circular: { [key: number]: number } = {}
let waiting = false
let flushing = false
let index = 0

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

// Async edge case #6566 requires saving the timestamp when event listeners are
// attached. However, calling performance.now() has a perf overhead especially
// if the page has thousands of event listeners. Instead, we take a timestamp
// every time the scheduler flushes and use that for all event listeners
// attached during that flush.
export let currentFlushTimestamp = 0

// Async edge case fix requires storing an event listener's attach timestamp.
let getNow: () => number = Date.now

// Determine what event timestamp the browser is using. Annoyingly, the
// timestamp can either be hi-res (relative to page load) or low-res
// (relative to UNIX epoch), so in order to compare time we have to use the
// same timestamp type when saving the flush timestamp.
// All IE versions use low-res event timestamps, and have problematic clock
// implementations (#9632)
if (inBrowser && !isIE) {
  const performance = window.performance
  if (
    performance &&
    typeof performance.now === 'function' &&
    getNow() > document.createEvent('Event').timeStamp
  ) {
    // if the event timestamp, although evaluated AFTER the Date.now(), is
    // smaller than it, it means the event is using a hi-res timestamp,
    // and we need to use the hi-res version for event listener timestamps as
    // well.
    getNow = () => performance.now()
  }
}

/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue () {
  // 获取当前 flush 的时间戳
  currentFlushTimestamp = getNow()
  // 标志当前 flushing 开始
  flushing = true
  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  // 在正式开始 flush 之前进行一个  queue 排序
  // 这么做的目的是确保：
  // 1、更新在组件更新时是更新是由父组件至子组件（因为父组件往往先于子组件）
  // 2、
  // 3、
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  // 不缓存 queue 的长度，因为 queue 中的 watcher 是有可能随时改变的
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    // 先执行 before
    if (watcher.before) {
      watcher.before()
    }
    // 取出一个 watcher，就要在相应的 id map 上将其对应的 id 置空
    id = watcher.id
    has[id] = null
    // 执行 watcher 的更新
    watcher.run()
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }
  
  // queue 遍历结束

  // keep copies of post queues before resetting state
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()

  // 重制 flush 相关状态数据
  resetSchedulerState()

  // call component updated and activated hooks
  // 执行组件的 activated 钩子函数
  callActivatedHooks(activatedQueue)
  // 执行组件 updated 钩子函数
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

// 执行组件的 updated 的钩子函数
function callUpdatedHooks (queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 * 将一个 watcher 放入 watcher 队列, 会跳过拥有完全一样 id 的  watcher ，除非当前的 watcher 队列已经执行完毕
 */
export function queueWatcher (watcher: Watcher) {
  // 获取 watcher 的 id
  const id = watcher.id
  // 建立一个关于 watcher.id 的 map, 跳过拥有相同 id 的 watcher
  if (has[id] == null) {
    // 标记当前 watcher 进入更新队列
    has[id] = true
    // 如果当前还未开始本轮的 update，将 watcher 推入队列
    if (!flushing) {
      queue.push(watcher)
    } else { 
      // 本轮 flush 已经开始但尚未结束，而又插入一个 watcher
      // 插入的这个 watcher 有两种情况：
      // 1、之前在 queue 中, 已经在 flush 中执行了 
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      let i = queue.length - 1
      // index ,当前 flush 执行的 watcher 位置
      // 如果当前 flush 并未遍历完毕 queue，根据插入的 watcher id 在 queue 中找到一个合适的位置
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      // 根据 i 将 新增的 watcher 插入到 queue 中
      queue.splice(i + 1, 0, watcher)
    }

    // queue the flush
    // 开始 queue 的 flush
    if (!waiting) {
      waiting = true

      if (process.env.NODE_ENV !== 'production' && !config.async) {
        flushSchedulerQueue()
        return
      }
      // 把 flushSchedulerQueue 推入到微任务中
      nextTick(flushSchedulerQueue)
    }
  }
}
