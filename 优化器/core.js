/**
 * 静态节点的特点：子节点也必须是静态节点
 * 静态节点的优点：
 * 1、每次渲染时，不需要未静态节点创建新节点
 * 2、patch的时候可以跳过静态节点
 */
function optimize(root) {
    if(!root){
        return;
    }
    //第一步：先标记所有的静态节点
    makeStatic(root);
    //第二步：标记所有的静态根节点
    makeRootStatic(root);
}

function makeStatic(node){
    node.static = isStatic(node);
    
    if(node.type === 1){        //元素节点
        for(let i = 0, l = node.children.length; i < l;i++){
            const child = node.children[i];
            makeStatic(child);
            //如果子节点不是静态节点，那么父节点也不属于静态节点，需要对父节点进行重置。
            if (!child.static) {
                node.static = false;
            }
        }        
    }
}
/**
 * 如果当前节点时静态根节点那么就不需要向下遍历子节点
 */
function makeRootStatic(node){
    if(node.type === 1){
        if ( node.static && node.children.length && !(node.children.length === 1 && node.children[0].type === 3) ) {
            node.staticRoot = true;
            return;
        }else{
            node.staticRoot = false;
        }

        if(node.children){
            for(let i = 0, i = node.children.length; i < l;i++){
                makeRootStatic(node.children[i]);
            }
        }

    }
}

function isStatic(node){
    //第一步: 带变量的动态文本节点
    if(node.type === 2){
        return false;
    }
    //第二步：不带变量的纯静态文本
    if(node.type === 3){
        return true;
    }
    //
    return !!(node.pre || (
            !node.hasBindings &&                //没有动态绑定 
            !node.if && !node.for &&            //没有 v-if 或 v-for 或 v-else
            !isBuiltInTag(node.tag) &&          //不是内置标签
            isPlatformReservedTag(node.tag) &&  //不是组件
            !isDirectChildOfTemplateFor(node) &&    //当前节点的父节点不能是带 v-for 指令的 template 标签
            Object.keys(node).every(isStaticKey)    //节点上不能存在动态节点才存在的属性
        ))
}