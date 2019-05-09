const parseHtml = require("./parseHtml.js");

function createASTElement(tag, attrs, parent){
    return {
        type: 1,
        tag,
        attrsList: attrs,
        parent,
        children: []
    }
}

function toString(val){
  return val === null ? '' : typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
}
const _s = toString();
function parseText(text) {
  const tagRE = /\{\{((?:.|\n)+?)\}\}/g;
  if(!tagRE.test(text)){
    return;
  }

  const tokens = [];
  let lastIndex = tagRE.lastIndex = 0;
  let match, index;
  while((match = tagRE.exec(text))){
    index = match.index;
    if(index > lastIndex){
      tokens.push(JSON.stringify(text.slice(lastIndex, index)));
    }
    tokens.push(`_s(${match[1].trim()})`);
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push(JSON.stringify(text.slice(lastIndex)));
  }
  return tokens.join('+');

}



let html = `<div>agrrg</div>`

parseHtml(html, {
  /**
   *
   * @param tag      标签名字
   * @param attrs    标签属性
   * @param unary    自闭合标签
   */
  start(tag, attrs, unary) {
    console.log("开始节点", tag);
    //let element = createASTElement(tag, attrs, currentParent);
  },
  end() {},
  chars(text) {
    text = text.trim();
    if(text){
      const children = currentParent.children;
      let expression;
      if(expression = parseText(text)){
        children.push({
          type: 2,
          expression,
          text
        })
      }else{
        children.push({
          type: 3,
          text
        })
      }
    }
  },
  comment(text) {
    let element = {
      type: 3,
      text,
      isComment: true
    };
  }
});
