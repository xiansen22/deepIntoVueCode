#### vm._watchers

vm._watchers 是挂载在 Vue 实例上的属性，在执行 new Vue() 进行 initState 初始化流程时会在 Vue 上设置 vm._watchers = [], 每创建一个 Watcher 实例便被 vm._watchers  收集，这样知道一个 Vue 实例上用户创建了多少个 watcher。