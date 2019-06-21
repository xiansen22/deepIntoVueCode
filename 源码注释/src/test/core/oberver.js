class Observer {

  constructor(value) {
    this.value = value;
    //将数组的依赖管理保存在 Obseerver 实例的 dep 属性上
   
    this.vmCount = 0;
    /**
     * 将 当前 Observer 实例赋给对象的 __ob__ 属性
     * 目的：为了在重写的数组中访问到 Observer 实例，到达访问 dep 触发依赖收集更新的目的。 
     */
   

    if (Array.isArray(value)) { 
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
  walk(obj) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      //对对象中的每一个属性进行侦测
      defineReactive(obj, keys[i]);
    }
  }
   /**
   * 对数组中的数据进行进一步的数据侦测。
   */
  observeArray(items) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i]);
    }
  }
}
function observe(value){
  
  ob = new Observer(value);   
  return ob; //将ob返回
}
function defineReactive(
  obj,
  key,
  val,
  customSetter,
  shallow
) {
 
  //获取该属性在该对象上的描述属性
  const property = Object.getOwnPropertyDescriptor(obj, key);
  //描述属性存在且不可配置，则放弃侦测该属性的变化
  if (property && property.configurable === false) {
    return;
  }
  
  // cater for pre-defined getter/setters  获取属性之前定义过的getter/setter
  const getter = property && property.get;
  const setter = property && property.set;
  //r如果没有定义get方法、到那时又set方法，并且参数为两个，获取属性对应的值
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key];
  }
  let childOb = !shallow && observe(val);

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val;
      console.log(value);
      if (childOb) {
        console.log("我是childOb");
      }
      //如果存在依赖，收集依赖
      
      return value;
    },
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val;
     
        val = newVal;
     
    }
  });
}

var obj = {name: {
  title: "hy"
}}

new Observer(obj);
obj.name.title