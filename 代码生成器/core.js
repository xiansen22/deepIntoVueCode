/**
 * 代码生成器生成的字符串会被包装进渲染函数，执行渲染函数会生成 VNode, 虚拟DOM通过 VNode 渲染页面
 * createElement      -->     _c
 * createTextVNode    -->     _v
 * createEmptyVNode   -->     _e
 * 
 * _c(tag, attrs, children);
 * 
 */

function genElement(el, state){
    const data = el.plain ? undefined : genData(el, state);

    const children = genChildren(el, state);

    code = `_c('${el.tag}'${
        data ? `,${data}` : ''
    }${
        children ? `,${children}` : ''
    })`;
    return code;
}

function genData(el, state){
    let data = '{';
    //key
    if(el.key){
        data += `key:${el.key},`
    }
    //ref
    if(el.ref){
        el += `ref:${el.ref},`
    }
    //pre
    if(el.pre){
        el += `pre:true`
    }
    data = data.replace(/,$/, '') + '}';
}

function genChildren(el, state) {
    const children = el.children;
    if(children.length){
        return `[${children.map(c => genNode(c, state)).join(',')}]`
    }
}

function genNode(node, state){
    if(node.type === 1){
        return genElement(node, state);
    }else if(node.type === 3 && node.isComment) {
        return genComment(node)
    }else{
        return genText(node)
    }
}

function genComment(comment){
    return `_e(${JSON.stringify(comment.text)})`;
}

function genText(text){
    return `_v(${text.type === 2 ? text.expression : JSON.stringify(text.text)})`
}