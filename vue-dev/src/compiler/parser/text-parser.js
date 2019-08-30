/* @flow */

import { cached } from 'shared/util'
import { parseFilters } from './filter-parser'

// 匹配模版语法 {{xxxx}}
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g
const regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g

const buildRegex = cached(delimiters => {
  const open = delimiters[0].replace(regexEscapeRE, '\\$&')
  const close = delimiters[1].replace(regexEscapeRE, '\\$&')
  return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
})

type TextParseResult = {
  expression: string,
  tokens: Array<string | { '@binding': string }>
}

export function parseText (
  text: string,
  delimiters?: [string, string]
): TextParseResult | void {
  const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE
  // 对于
  if (!tagRE.test(text)) {
    return
  }
  const tokens = [] // 放入的都是字符串
  const rawTokens = [] // 放入的是原始值
  // 上一次匹配到的位置
  let lastIndex = tagRE.lastIndex = 0
  let match, index, tokenValue
  // 循环匹配将 text 中所有的模版语法提取出来，一次循环
  while ((match = tagRE.exec(text))) {
    // index : 匹配到的开始位置
    index = match.index
    // push text token
    // 如果  index > lastIndex === true 则证明 模版语法前面有 其他文本内容，需要将其保存起来
    if (index > lastIndex) {
      // 分割其他内容
      rawTokens.push(tokenValue = text.slice(lastIndex, index))
      tokens.push(JSON.stringify(tokenValue))
    }
    // tag token, 针对 模版语法中使用了 filter | 进行处理
    const exp = parseFilters(match[1].trim())
    tokens.push(`_s(${exp})`)
    rawTokens.push({ '@binding': exp })
    lastIndex = index + match[0].length
  }
  // 将文本内容 }} 后面的内容取出
  if (lastIndex < text.length) {
    rawTokens.push(tokenValue = text.slice(lastIndex))
    tokens.push(JSON.stringify(tokenValue))
  }

  return {
    expression: tokens.join('+'),
    tokens: rawTokens
  }
}
