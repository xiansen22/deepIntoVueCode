const comment = /^<!--/;

let html = "<!--这是注释-->"
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

/**
 * 条件注释
 * 在VUE中写条件注释是没有用的，写了也会被截取
 */

const conditionalComment = /^<!\[/;
if(conditionalComment.test(hml)){
    const conditionalEnd = html.indexOf(']>');

    if(conditionalEnd >= 0){
        html = html.substring(conditionalEnd + 2);
        continue;
    }
}

/**
 * 截取 DOCTYPE
 */
const doctype = /^<!DOCTYPE [^>]+/i;
const doctypeMatch = html.match(doctype);
if(doctypeMatch){
    html = html.substring(doctypeMatch[0].length);
    continue;
}