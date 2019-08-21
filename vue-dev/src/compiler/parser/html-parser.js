/**
 * Not type-checking this file because it's mostly vendor code.
 */

/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson (MPL-1.1 OR Apache-2.0 OR GPL-2.0-or-later)
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

import { makeMap, no } from 'shared/util'
import { isNonPhrasingTag } from 'web/compiler/util'
import { unicodeRegExp } from 'core/util/lang'

/**
 * Regular Expressions for parsing tags and attributes
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
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
//第一个集合确保标签名字是以26个英语字母或_打头开始，第二个集合表示标签名可以包含任意单词、下划线、-、. 
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`
// 一共两个捕获组，第二个捕获组因为使用了 ?: 所以可以匹配但是不会获取匹配结果，匹配 <div:xxx></div> 这样的数据 
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
// 匹配结束标签 /> 或者 >
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)

// <!DOCTYPE > 标签的正则检测
const doctype = /^<!DOCTYPE [^>]+>/i

// #7298: escape - to avoid being passed as HTML comment when inlined in page
// 注释的正则检测
const comment = /^<!\--/
// 条件注释的正则检测 <![IE]>
const conditionalComment = /^<!\[/

// Special Elements (can contain anything)
export const isPlainTextElement = makeMap('script,style,textarea', true)
const reCache = {}

const decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t',
  '&#39;': "'"
}
const encodedAttr = /&(?:lt|gt|quot|amp|#39);/g
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g

// #5992
const isIgnoreNewlineTag = makeMap('pre,textarea', true)
const shouldIgnoreFirstNewline = (tag, html) => tag && isIgnoreNewlineTag(tag) && html[0] === '\n'

// 对标签属性中的字符实体进行编码
function decodeAttr (value, shouldDecodeNewlines) {
  const re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr
  return value.replace(re, match => decodingMap[match])
}

/**
 * 解析 html 字符串
 */
export function parseHTML (html, options) {
  const stack = []
  const expectHTML = options.expectHTML
  const isUnaryTag = options.isUnaryTag || no
  const canBeLeftOpenTag = options.canBeLeftOpenTag || no
  let index = 0
  let last, lastTag
  // 循环处理
  while (html) {
    last = html
    // Make sure we're not in a plaintext content element like script/style
    if (!lastTag || !isPlainTextElement(lastTag)) {
      // 寻找第一个 < 标志的位置
      let textEnd = html.indexOf('<')
      // 如果是第一个位置，如果对其做一下判断
      if (textEnd === 0) {
        // Comment: 检测是否是注释内容 完整的注释标签 <!--我是注释-->
        if (comment.test(html)) {
          // 获取注释结束的位置
          const commentEnd = html.indexOf('-->')
          // 对注释内容进行处理
          if (commentEnd >= 0) {
            // 如果设置保留注释，则会将注释构建进 AST 语法树中
            if (options.shouldKeepComment) {
              // 先将注释内容截取出来
              options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3)
            }
            // 对 html 字符串进行截取，对剩下未处理的字符串继续处理
            advance(commentEnd + 3)
            continue
          }
        }

        // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
        // 检测是否是条件注释,条件注释是不会构建进 AST 语法树，所以在 VUE 中写了条件注释也是没有用的
        if (conditionalComment.test(html)) {
          const conditionalEnd = html.indexOf(']>')

          // 将条件注释内容部分截取掉，继续处理剩余的字符串
          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2)
            continue
          }
        }

        // Doctype: 截取掉 <!Doctype >标签内容
        const doctypeMatch = html.match(doctype)
        if (doctypeMatch) {
          advance(doctypeMatch[0].length)
          continue
        }

        // End tag: 处理结束标签 </xxx>
        const endTagMatch = html.match(endTag)
        if (endTagMatch) {
          const curIndex = index
          advance(endTagMatch[0].length)
          parseEndTag(endTagMatch[1], curIndex, index)
          continue
        }

        // Start tag: 处理开始标签 <xxx>
        const startTagMatch = parseStartTag()
        if (startTagMatch) {
          handleStartTag(startTagMatch)
          if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
            advance(1)
          }
          continue
        }
      }

      let text, rest, next
      if (textEnd >= 0) {
        rest = html.slice(textEnd)
        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          // < in plain text, be forgiving and treat it as text
          next = rest.indexOf('<', 1)
          if (next < 0) break
          textEnd += next
          rest = html.slice(textEnd)
        }
        text = html.substring(0, textEnd)
      }

      if (textEnd < 0) {
        text = html
      }

      if (text) {
        advance(text.length)
      }

      if (options.chars && text) {
        options.chars(text, index - text.length, index)
      }
    } else {
      let endTagLength = 0
      const stackedTag = lastTag.toLowerCase()
      const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'))
      const rest = html.replace(reStackedTag, function (all, text, endTag) {
        endTagLength = endTag.length
        if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
          text = text
            .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
        }
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          text = text.slice(1)
        }
        if (options.chars) {
          options.chars(text)
        }
        return ''
      })
      index += html.length - rest.length
      html = rest
      parseEndTag(stackedTag, index - endTagLength, index)
    }

    if (html === last) {
      options.chars && options.chars(html)
      if (process.env.NODE_ENV !== 'production' && !stack.length && options.warn) {
        options.warn(`Mal-formatted tag at end of template: "${html}"`, { start: index + html.length })
      }
      break
    }
  }

  // Clean up any remaining tags
  parseEndTag()

  // 对字符串进行截取
  function advance (n) {
    // 记录当前的位置
    index += n
    html = html.substring(n)
  }

  // 解析开始标签
  function parseStartTag () {
    const start = html.match(startTagOpen)
    // 匹配到开始标签
    if (start) {
      // 第一步只是提取到开始标签的名字和位置，并没有获取到开始标签内的属性（eg: class、data-set 等等）
      const match = {
        tagName: start[1], // 标签 name （ eg: div, sapn, p 等 ）
        attrs: [], // 属性集合
        start: index // 在 html 字符串中是第几个位置
      }
      // 将匹配到开始标签内容截取掉，截取掉的内容格式 （ eg: <xxx ）
      advance(start[0].length)
      let end, attr
      // 循环处理，用以获取开始标签内的属性，这个属性可以是 普通的 html 属性，也可以是动态属性，比如 @click = xxx 或者 || :index = xxx
      while (!(end = html.match(startTagClose)) && (attr = html.match(dynamicArgAttribute) || html.match(attribute))) {
        // 记录起始位置
        attr.start = index
        // 截取掉匹配到的内容
        advance(attr[0].length)
        // 记录结束位置
        attr.end = index
        // 添加到属性 attrs 中保存起来
        match.attrs.push(attr)
      }
      // 匹配到结束标签
      if (end) {
        // 记录但标签
        match.unarySlash = end[1]
        advance(end[0].length)
        // 记录开始标签的结束位置
        match.end = index
        return match
      }
    }
  }
  /**
   * 处理开始标签的匹配结果
   */
  function handleStartTag (match) {
    // 拿到标签名
    const tagName = match.tagName
    // 是否是自闭合标签
    const unarySlash = match.unarySlash
    // 暂解
    if (expectHTML) {
      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        parseEndTag(lastTag)
      }
      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        parseEndTag(tagName)
      }
    }
    // 检测是否是自闭合标签
    const unary = isUnaryTag(tagName) || !!unarySlash
    // 获取标签属性集合
    const l = match.attrs.length
    const attrs = new Array(l)
    for (let i = 0; i < l; i++) {
      // 获取具体的属性名
      const args = match.attrs[i]
      // 获取属性值
      const value = args[3] || args[4] || args[5] || ''
      const shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
        ? options.shouldDecodeNewlinesForHref
        : options.shouldDecodeNewlines
      attrs[i] = {
        name: args[1],
        value: decodeAttr(value, shouldDecodeNewlines)
      }
      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        attrs[i].start = args.start + args[0].match(/^\s*/).length
        attrs[i].end = args.end
      }
    }

    // 不是自闭合标签，需要入栈，对子元素进行收集处理
    if (!unary) {
      stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs, start: match.start, end: match.end })
      lastTag = tagName
    }

    // 调用 options.start 处理
    if (options.start) {
      options.start(tagName, attrs, unary, match.start, match.end)
    }
  }

  function parseEndTag (tagName, start, end) {
    let pos, lowerCasedTagName
    if (start == null) start = index
    if (end == null) end = index

    // Find the closest opened tag of the same type
    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase()
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    } else {
      // If no tag name is provided, clean shop
      pos = 0
    }

    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (let i = stack.length - 1; i >= pos; i--) {
        if (process.env.NODE_ENV !== 'production' &&
          (i > pos || !tagName) &&
          options.warn
        ) {
          options.warn(
            `tag <${stack[i].tag}> has no matching end tag.`,
            { start: stack[i].start, end: stack[i].end }
          )
        }
        if (options.end) {
          options.end(stack[i].tag, start, end)
        }
      }

      // Remove the open elements from the stack
      stack.length = pos
      lastTag = pos && stack[pos - 1].tag
    } else if (lowerCasedTagName === 'br') {
      if (options.start) {
        options.start(tagName, [], true, start, end)
      }
    } else if (lowerCasedTagName === 'p') {
      if (options.start) {
        options.start(tagName, [], false, start, end)
      }
      if (options.end) {
        options.end(tagName, start, end)
      }
    }
  }
}
