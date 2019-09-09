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
        ],
        count: 0
    },
    filters: {
      capitalize: function (value) {
        if (!value) return ''
        value = value.toString()
        return value.charAt(0).toUpperCase() + value.slice(1)
      }
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
    },
    methods: {
      add: function() {
        this.$forceUpdate();
        this.count = 1;
      }
    }
})