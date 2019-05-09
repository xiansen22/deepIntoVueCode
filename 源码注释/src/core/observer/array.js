/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

/**
 * 将 Array 上可以改变数组本身的方法拿出来。
 * 因为 Object.definedObject 检测不到通过数组方法对数组进行改变的行为
 */
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 * 重写数组上可以修改数组本身的方法，目的是为了拦截这些方法，能够在调用这些方法时做一些准备或者改变。
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  def(arrayMethods, method, function mutator (...args) {
    
    //调用原生的方法执行。
    const result = original.apply(this, args)

    // this.__ob__ 是 Observer 实例，在 new Observer 的时候，Observer 会将实例添加到 __ob__ 属性上
    const ob = this.__ob__
    
    //定义新添加的数据变量
    let inserted 
    
    /**
     * push、unshift、splice 属于对数组增添数据的方法。
     * 我们需要对新添加的数据需要进行变化侦测
     */
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted)
    // notify change
    ob.dep.notify()
    return result
  })
})
