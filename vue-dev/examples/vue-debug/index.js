// Vue.directive('pin', {
//     bind: function (el, binding, vnode) {
//       el.style.position = 'fixed'
//       el.style.top = binding.value + 'px'
//     }
//   })
new Vue({
    el: '#app',
    props: {
        list: function() {
            return {
                type: Object,
                default: {}
            }
        }
    },
    data: {
        numbers: [
            {
                name: 'hy'
            }
        ]
    },
    directives: {
        pin: function(el){
            console.log(el);
        }
    },
    data: {
        name: "hy"
    },
    beforeCreate: function() {
      console.log('i am beforeCreate');
    }
})