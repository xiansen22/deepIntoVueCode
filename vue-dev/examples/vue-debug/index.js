Vue.directive('pin', {
    bind: function (el, binding, vnode) {
      el.style.position = 'fixed'
      el.style.top = binding.value + 'px'
    }
  })
new Vue({
    el: '#app',
    directives: {
        pin: function(el){
            console.log(el);
        }
    },
    data: {
        name: "hy"
    }
})