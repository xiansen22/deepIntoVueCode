
/**
 * @ncname          第一个集合确保标签名字是以26个英语字母或_打头开始，第二个集合表示标签名可以包含任意单词、下划线、-、. 
 * @qnameCapture    一共两个捕获组，第二个捕获组因为使用了 ?: 所以可以匹配但是不会获取匹配结果，匹配 <div:dic></div> 这样的数据 
 */
const ncname = `[a-zA-Z_][\\w\\-\\.]*`;                 
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`);

/**
 * 解析属性，我们需要拿到三个值（属性名、=、属性值）
 * 这个正则表达式一共有七个捕获组，其中两个不会被获取匹配结果，剩余的五个是我们需要的信息
 * 第一个捕获组 ([^\s"'<>\/=]+) 匹配任何非(空白符、"'<>/=)  即匹配属性名
 * 第二个捕获组 (?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))       不会获取匹配结果
 * 第三个捕获组 (=)  即匹配 = 
 * 第四个捕获组 (?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+))  不会获取匹配结果 用来匹配 "value" 、'value'、 value(无[空白符、"、'、=、<、>])类型的属性值
 * 第五个捕获组 "([^"]*)"+          匹配 "value"
 * 第六个捕获组 '([^']*)'+          匹配 'value'
 * 第七个捕获组 ([^\s"'=<>`]+))+    匹配value(无[空白符、"、'、=、<、>])类型
 */
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;

/**
 * 检测是否是自闭和标签
 */
const startTagClose = /^\s*(\/?)>/;

let html = `<div class="name"></div>`;

function advance(n) {
    html = html.substring(n);
}

function parseStartTag(){
    //解析标签名，判断模板是否符合开始标签的特征
    const start = html.match(startTagOpen);
    if(start){
        const match = {
            tagName: start[1],
            attrs: []
        }
        advance(start[0].length);

        let end;
        let attr;

        //循环解析获取标签属性
        while (!(end = html.match(startTagClose)) &&(attr = html.match(attribute))) {
            advance(attr[0].length);
            match.attrs.push(attr);
        }

        //判断该标签是否是自闭合标签
        if (end) {
            match.unarySlash = end[1];
            advance(end[0].length);
            return match;
        }
    }
}
const parseResult = parseStartTag();
console.log(parseResult);