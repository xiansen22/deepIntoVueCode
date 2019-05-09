const ncname = '[a-zA-Z_][\\w\\-\\.]*';
const qnameCaptuer = `((?:${ncname}\\:)?${ncname})`;
const endTag = new RegExp(`^<\\/${qnameCaptuer}[^>]*>`);

let html = "</div>";

//截取结束标签
const endTagMatch = html.match(endTag);
if (endTagMatch) {
    html = html.substring(endTagMatch[0].length);
    options.end(endTagMatch[1]);
    continue;
}