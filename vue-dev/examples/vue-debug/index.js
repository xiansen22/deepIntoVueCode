// Vue.directive('pin', {
//     bind: function (el, binding, vnode) {
//       el.style.position = 'fixed'
//       el.style.top = binding.value + 'px'
//     }
//   })

const Child = Vue.component('child', {
  props: ['role', 'number', 'count'],
  data: function() {
    return {
      counta: 0
    }
  },
  template: `
    <div id="child">我是子组件 {{count}}</div>
  `,
  created: function() {
    console.log('我是子组件的 created', this.count);
  },
  mounted: function() {

  },
  beforeDestroy: function() {
    
  }
})


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
    components: {
      child: Child
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
        
    },
    methods: {
      add: function() {
        this.count += 1;
      }
    }
})