class Observer {
  constructor(obj) {
    this.walk(obj);
  }
  walk(obj) {
    const keys = Object.keys(obj);
    for (let i = 0, len = keys.length; i < len; i++) {
        const key = keys[i];
      defineReactive(obj, key, obj[key]);
    }
  }
}
function defineReactive(obj, key, value){
    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get: function(){            //在get方法中进行依赖的收集
            console.log("我被获取了")
            return value;
        },
        set: function(newValue){    //在set方法中进行依赖的触发
            console.log("我被设置了", newValue);
            value = newValue;
        }
    })
}
const student = {
    name: "hy"
}
new Observer(student);
student.name = "hj";
console.log(student);