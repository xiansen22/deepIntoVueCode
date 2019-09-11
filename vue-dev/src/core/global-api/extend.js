/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

// 挂载 extend 方法
export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   * 每一个实例构造函数，包括 Vue,都有一个独一无二的 cid 属性。
   * 使我们能够创建一个封装过的 子构造函数用于原型继承和储存她们
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   * 使用基础 Vue 构造器，创建一个“子类”。参数是一个包含组件选项的对象
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this // 声明父构造函数 this => Vue
    const SuperId = Super.cid // 为父构造函数指定 cid
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {}) // 声明子构造函数的缓存
    // 如果此子构造函数已经存在，只需要将原有的取出返回，不再重复创建 （单例模式）
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }
    // 取出组件名称
    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }
    
    // 定义子构造函数，实现继承
    const Sub = function VueComponent (options) {
      this._init(options)
    }
    Sub.prototype = Object.create(Super.prototype) // 继承父构造函数的原型方法
    Sub.prototype.constructor = Sub // 修改 Sub 原型的 constructor
    
    Sub.cid = cid++  // 为子构造函数创建 cid
    Sub.options = mergeOptions( // 合并父构造函数的 options
      Super.options,
      extendOptions
    )
    console.log(Super.options,444);
    Sub['super'] = Super // 保存父构造函数

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      initProps(Sub)
    }
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    // 使子类拥有自己的私有资源
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    // 开启递归式的自我查找
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options // 缓存父构造函数的 options
    Sub.extendOptions = extendOptions // 缓存子构造函数的初始 options
    Sub.sealedOptions = extend({}, Sub.options) // 子构造函数的一个备份

    // cache constructor
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
