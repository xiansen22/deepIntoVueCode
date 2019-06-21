/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}
/**
 * @target 
 */
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

export function initState (vm: Component) {
  // 定义实例上所有的watcher存放位置
  vm._watchers = []
  const opts = vm.$options
  // 如果存在props，则初始化 prosp
  if (opts.props) initProps(vm, opts.props)
  // 如果存在 methods，则初始化 methods
  if (opts.methods) initMethods(vm, opts.methods)
  // 初始化数据、开始对数据进行侦测
  if (opts.data) {    // 如果我们定义了data属性，那么开始初始化data,主要是做数据侦测
    initData(vm)
  } else {    // 如果没有定义data属性，那么再实例上初始化_data属性，并进行侦测
    observe(vm._data = {}, true /* asRootData */)
  }
  // 初始化计算属性
  if (opts.computed) initComputed(vm, opts.computed)
  // 初始化观察属性
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}
/**
 * @vm 组件实例
 * @propsOptions props 可以是数组或对象，用于接收来自父组件的数据
 */
function initProps (vm: Component, propsOptions: Object) {
  // propsData 只用于 new 创建的实例中。用在全局扩展时进行传递数据
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  // 缓存 props 的键值，同时将这些键值保存在实例 _propKeys 属性上，以便后期 props 更新时可以用数组去迭代
  const keys = vm.$options._propKeys = []
  // 是否为根节点（没有父级就是根节点）
  const isRoot = !vm.$parent 

  // root instance props should be converted
  // 根实例 props 应该被侦测 ？？？
  if (!isRoot) {
    toggleObserving(false)
  }
  // 开始遍历 props
  for (const key in propsOptions) {
    // 将 props 中的 key 缓存起来
    keys.push(key)
    // 检测是否符合期望的类型，并返回对应的值
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      // 侦测 props 数据
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.\
    // 将 prop 映射到 vm 实例上，可以通过 this 来直接访问 props 中的每一项
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}

function initData (vm: Component) {
  //拿到Vue实例上的data属性
  let data = vm.$options.data
  // 如果data是函数，则执行该函数获取data
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  // 判断 data 是否是纯对象
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  // 在实例上侦测数据变化
  const keys = Object.keys(data)    // 拿到 data 中的 key
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length

  // 遍历每一个属性
  while (i--) {
    const key = keys[i]
    // 测试环境下，警告 data 中的属性不能与 mthods 中的方法重名
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    // key 不能和 props 中的属性重名 
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {    // 如果key 不是以 $ 或者 _ 开头，则进行将 key 映射到 实例 this 上
      proxy(vm, `_data`, key)
    }
  }
  // observe data 对 data 中的数据进行数据侦测
  observe(data, true /* asRootData */)
}

export function getData (data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

const computedWatcherOptions = { lazy: true }

function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  // 在实例上定义 _computedWatchers 用于管理 computed 的 watcher 实例
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()
  // 开始遍历 computed 中每个属性
  for (const key in computed) {
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    if (!isSSR) {
      // create internal watcher for the computed property.
      // 为计算属性创建内部 watcher 实例
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)    // 传入参数：实例、属性、属性值
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}

export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()
  // 计算属性是函数
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter (key) {
  // 设置 computed 属性的getter
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      // 如果watcher是懒执行，那么调用 watcher.evaluate 触发侦测数据的getter进行依赖收集
      if (watcher.dirty) {
        watcher.evaluate()
      }
      // 如果此时还存在 Dep.target 那么将 watcher 收集到所有依赖的Dep中
      if (Dep.target) {
        watcher.depend()
      }
      // 返回 watcher的值
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  // 设置 computed 属性的getter
  return function computedGetter () {
    return fn.call(this, this)
  }
}
/**
 * 将 methods 中的所有方法绑定到实例上，可以通过 this 来访问
 */
function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    // noop 什么也不执行的空函数
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}
/**
 * 初始化侦听属性
 */
function initWatch (vm: Component, watch: Object) {
  // 拿到侦听属性中的每一个属性
  for (const key in watch) {
    // 拿到属性对应的处理方法
    const handler = watch[key]
    // 如果是数组需要循环调用处理
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}
/**
 * 创建一个观察
 * $options Object (immediate、deep等)
 */
function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  // 如果handler是一个对象，那么这个对象的处理方法对应的键名为handler
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  // 如果handler是字符串，那么将从组件实例上获取对应的方法
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}

export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  Vue.prototype.$set = set
  Vue.prototype.$delete = del
  /**
   * 用于观察一个属性的变化
   */
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this
    // 如果 cb 是一个配置对象 {handler: function(){}, deep, immediate}
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    options.user = true
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      try {
        cb.call(vm, watcher.value)
      } catch (error) {
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }
    // 返回一个取消观察的函数
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}
