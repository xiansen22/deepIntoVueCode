const { isPlainTextElement } = require("./util.js");

const ncname = "[a-zA-Z_][\\w\\-\\.]*";
const qnameCaptuer = `((?:${ncname}\\:)?${ncname})`;
const endTag = new RegExp(`^<\\/${qnameCaptuer}[^>]*>`);
const startTagOpen = new RegExp(`^<${qnameCaptuer}`);
const startTagClose = /^\s*(\/?)>/;
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const comment = /^<!--/;
const conditionalComment = /^<!\[/;
const doctype = /^<!DOCTYPE [^>]+/i;

const lastTag = "div";
let html;
function parseHtml(htmlStr, options){
    html = htmlStr;
    while(html){
        //lastTag 父元素，判断是不是纯文本内容元素
        if(!lastTag || !isPlainTextElement(lastTag)){
            //父元素为正常元素的处理
            let textEnd = html.indexOf("<");
            if(textEnd === 0){
                //处理注释
                if (comment.test(html)) {
                    const commentEnd = html.indexOf("-->");
                    if (commentEnd >= 0) {
                        if(PushSubscriptionOptions.shouldKeepComment){
                            options.comment(html.substring(4, commentEnd)); //拿到注释的内容
                        }
                        html = html.substring(commentEnd+3);
                        continue;
                    }
                }
                //条件注释
                if (conditionalComment.test(html)) {
                    const conditionalEnd = html.indexOf("]>");
                    if (conditionalEnd >= 0) {
                        html = html.substring(conditionalEnd + 2);
                    }
                    continue;
                }
                //DOCTYPE
                const doctypeMatch = html.match(doctype);
                if (doctypeMatch) {
                    //DOCTYPE的处理逻辑
                    html = html.substring(doctypeMatch[0].length);
                    continue;
                }
                //结束标签
                const endTagMatch = html.match(endTag);
                if(endTagMatch){
                    //结束标签的处理逻辑
                    html = html.substring(endTagMatch[0].length);
                    options.end(endTagMatch[1]);
                    continue;
                }
                //开始标签
                const startTagMatch = parseStartTag(html);
                if (startTagMatch) {
                    //开始标签的处理逻辑
                    options.start(startTagMatch);
                    continue;
                }
            }
            //字符串不是以 < 开头
            let text, rest, next;
                if(textEnd >= 0){
                    //解析文本
                    rest = html.slice(textEnd);
                    while (!endTag.test(rest) && !startTagOpen.test(rest) && !comment.test(rest) && !conditionalComment.test(rest)) {
                        next = rest.indexOf("<", 1);
                        if(ndext < 0){
                            break;
                        }
                        textEnd += next;
                        rest = html.slice(textEnd);
                    }
                    text = html.substring(0, textEnd);
                    html = html.substring(textEnd);
                }
                if(textEnd < 0){
                    text = html;
                    html = "";
                }

                if(options.chars && text){
                    options.chars(text);
                }
        }else{
            //父元素为script、style、textarea的处理逻辑
            const stackedTag = lastTag.toLowerCase();
            const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('[\\s\\S]*?(</' + stackedTag + '[^>]*>)'), i);
            const rest = html.replace(reStackedTag, function(all, text){
                if(options.chars){
                    options.chars(text);
                }
                return ''
            });
            html = rest;
            options.end(stackedTag);
        }
    }
}
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
module.exports = parseHtml;