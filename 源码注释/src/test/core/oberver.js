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
  console.log(!getter , setter, arguments.length === 2);

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val;
      console.log(value);
      //如果存在依赖，收集依赖
      
      return value;
    },
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val;
     
        val = newVal;
     
    }
  });
}

var obj = {name: "hy"}
defineReactive(obj, "name");
obj.name;