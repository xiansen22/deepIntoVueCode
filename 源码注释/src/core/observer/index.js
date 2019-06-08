/* @flow */

import Dep from "./dep";
import VNode from "../vdom/vnode";
import { arrayMethods } from "./array";
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from "../util/index";

const arrayKeys = Object.getOwnPropertyNames(arrayMethods);

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true;

export function toggleObserving(value: boolean) {
  shouldObserve = value;
}

/**
 * Observer 会被附加到每一个被侦测的对象上。
 * 一旦被附加上，Observer 会将 Object 的所有属性转换为 getter 和setter 的形式
 * 来收集依赖，并且在属性发生变化时通知这些依赖。
 *
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor(value: any) {
    this.value = value;
    //将子属性为Object 和 Array类型的依赖管理保存在 Obseerver 实例的 dep 属性上
    this.dep = new Dep();
    this.vmCount = 0;
    /**
     * 将 当前 Observer 实例赋给对象的 __ob__ 属性
     * 目的：为了在重写的数组中访问到 Observer 实例，到达访问 dep 触发依赖收集更新的目的。
     */
    def(value, "__ob__", this);

    if (Array.isArray(value)) { 
      //处理数组
      if (hasProto) {
        //检查对象是否有 __proto__ 属性
        protoAugment(value, arrayMethods); //如果有 __proto__ 属性，则重写 arrayMethods 里面的方法
      } else {
        copyAugment(value, arrayMethods, arrayKeys); //如果没有则直接把 arrayMethods 的方法写在 value 上，这样就不可以不请求数组原型上相关的方法
      }
      this.observeArray(value);
    } else {
      //处理对象类型的侦测
      this.walk(value);
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   * 遍历对象所有的属性，将他们转换成getter/setter，此方法只在value为对象类型时才执行
   */
  walk(obj: Object) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      //对对象中的每一个属性进行侦测
      defineReactive(obj, keys[i]);
    }
  }

  /**
   * 对数组中的数据进行进一步的数据侦测。
   */
  observeArray(items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i]);
    }
  }
}

/**
 * 下面是一些辅助函数
 * helpers
 */

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 * 使用 __proto__ 对数组原型进行重写，主要为了对数组实现侦测
 */
function protoAugment(target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src;
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 * 无法通过 __proto__ 访问到数组的原型，那么通过较为直接的方法将修改后数组原型附加在数组上，
 * 在原型链上拦截了对数组原型相关方法的访问
 */
/* istanbul ignore next */
function copyAugment(target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    def(target, key, src[key]);
  }
}

/**
 * 尝试为 value 创建一个 Observer 实例
 * 目的是为了对 value 进行数据侦测
 * 如果创建成功则立刻返回新创建的 Observer 实例,
 * 如果 value 已经存在 Observer 实例，则直接返回它.
 *
 * value 如果不是 Object 或者是 VNode 的实例，则返回undefined
 * 
 * 主要用于迭代为属性值为 Object 或 Array 类型的值进行侦测
 */
export function observe(value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return;
  }

  let ob: Observer | void;

  if (hasOwn(value, "__ob__") && value.__ob__ instanceof Observer) {    //如果本身就有 __ob__ 属性，并且是 Observer 的实例则返回value.__ob__
    ob = value.__ob__;
  } else if (             //可以观察并且不是服务器渲染，值为数组或者是纯对象 并且值可扩展，并且_isVue 为假
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value);   //对值进行侦测
  }

  if (asRootData && ob) {
    ob.vmCount++;
  }

  return ob;  //将ob返回
}

/**
 * Define a reactive property on an Object.
 * 将一个对象上的属性转换为可侦测。
 */
export function defineReactive(
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  //为该属性创建依赖管理
  const dep = new Dep();
  //获取该属性在该对象上的描述属性
  const property = Object.getOwnPropertyDescriptor(obj, key);
  //描述属性存在且不可配置，则放弃侦测该属性的变化
  if (property && property.configurable === false) {
    return;
  }

  // cater for pre-defined getter/setters  获取属性之前定义过的getter/setter
  const getter = property && property.get;
  const setter = property && property.set;
  //如果没有定义get方法、或者定义了set方法，并且参数为两个，获取属性对应的值
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key];
  }
  //shallow为false,对属性值进行侦测，这里主要是实现对子属性的迭代侦测
  let childOb = !shallow && observe(val);
  //开始对属性进行侦测
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      //如果属性定义了get方法，使用属性的get方法获取属性对应的值，否则使用 obj[key]
      const value = getter ? getter.call(obj) : val;
      //如果存在依赖，收集依赖
      if (Dep.target) {
        dep.depend();   //在此收集依赖

        if (childOb) {  //childOb 存在有两种情况，value为 Object 类型 或 Array 类型
          childOb.dep.depend(); //同时用 Observer 实例的dep属性收集依赖，供 Array和Object 使用 子属性的值发生变化也归属于父属性的侦测范围
          
          if (Array.isArray(value)) {//如果 Value 是一个数组，需要对数组中的每一项进行依赖的收集
            dependArray(value);
          }
        }
      } 
      return value;
    },
    set: function reactiveSetter(newVal) {
      //先获取属性的值
      const value = getter ? getter.call(obj) : val;
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return;
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== "production" && customSetter) {
        customSetter();
      }
      // #7981: for accessor properties without setter
      //对于只有 getter没有 setter的属性不进行下一步操作
      if (getter && !setter) return;
  
      if (setter) {      //存在 setter 调用setter自行设置
        setter.call(obj, newVal);
      } else {            //否则手动设置
        val = newVal;
      }
      //对新设置的值进行侦测
      childOb = !shallow && observe(newVal);
      //触发依赖
      dep.notify();
    }
  });
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set(target: Array<any> | Object, key: any, val: any): any {
  if (
    process.env.NODE_ENV !== "production" &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(
      `Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`
    );
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key);
    target.splice(key, 1, val);
    return val;
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val;
    return val;
  }
  const ob = (target: any).__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== "production" &&
      warn(
        "Avoid adding reactive properties to a Vue instance or its root $data " +
          "at runtime - declare it upfront in the data option."
      );
    return val;
  }
  if (!ob) {
    target[key] = val;
    return val;
  }
  defineReactive(ob.value, key, val);
  ob.dep.notify();
  return val;
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del(target: Array<any> | Object, key: any) {
  if (
    process.env.NODE_ENV !== "production" &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(
      `Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`
    );
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1);
    return;
  }
  const ob = (target: any).__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== "production" &&
      warn(
        "Avoid deleting properties on a Vue instance or its root $data " +
          "- just set it to null."
      );
    return;
  }
  if (!hasOwn(target, key)) {
    return;
  }
  delete target[key];
  if (!ob) {
    return;
  }
  ob.dep.notify();
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray(value: Array<any>) {
  //遍历数组
  for (let e, i = 0, l = value.length; i < l; i++) {
    //拿到数组中的每一项值
    e = value[i];  
    //值存在且值上有 __ob__ 属性，添加依赖
    e && e.__ob__ && e.__ob__.dep.depend();
    if (Array.isArray(e)) {
      dependArray(e);
    }
  }
}
