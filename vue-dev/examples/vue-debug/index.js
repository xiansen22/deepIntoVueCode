// Vue.directive('pin', {
//     bind: function (el, binding, vnode) {
//       el.style.position = 'fixed'
//       el.style.top = binding.value + 'px'
//     }
//   })
new Vue({
    el: '#app',
    props: {
        list: {
            type: Object,
            default: function() {
                return {}
            }
        }
    },
    directives: {
        pin: function(el){
            console.log(el);
        }
    },
    data: {
        name: "hy",
        numbers: [
            {
                name: 'hy',
                age: 10
            },
            {
                name: 'hys',
                age: 9
            }
        ]
    },
    computed: {
        oldPeople: function() {
            const a = this.numbers.sort((pre, next)=>{
                return next.age - pre.age > -1;
            })[0];
            a.sex = "man";
            return a;
        }
    },
    beforeCreate: function() {
      console.log('i am beforeCreate');
    },
    mounted: function(){
        console.log(this.list);
    }
})