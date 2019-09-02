/* @flow */

import { makeMap, isBuiltInTag, cached, no } from 'shared/util'

let isStaticKey
let isPlatformReservedTag

const genStaticKeysCached = cached(genStaticKeys)

/**
 * Goal of the optimizer: walk the generated template AST tree
 * and detect sub-trees that are purely static, i.e. parts of
 * the DOM that never needs to change.
 *
 * Once we detect these sub-trees, we can:
 *
 * 1. Hoist them into constants, so that we no longer need to
 *    create fresh nodes for them on each re-render;
 * 2. Completely skip them in the patching process.
 */
export function optimize (root: ?ASTElement, options: CompilerOptions) {
  if (!root) return
  isStaticKey = genStaticKeysCached(options.staticKeys || '') // options.staticKeys => staticClass,staticStyle
  isPlatformReservedTag = options.isReservedTag || no // 是否是平台的保留标签
  // first pass: mark all non-static nodes.
  // 标记静态节点
  markStatic(root)
  // second pass: mark static roots.
  // 标记根静态节点
  markStaticRoots(root, false)
}

/**
 * 静态节点拥有的属性，不含动态节点包含的属性
 */
function genStaticKeys (keys: string): Function {
  return makeMap(
    'type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap' +
    (keys ? ',' + keys : '')
  )
}

// 递归标记 ast 语法树中的节点是否是静态节点
function markStatic (node: ASTNode) {
  node.static = isStatic(node)
  if (node.type === 1) {
    // do not make component slot content static. this avoids
    // 1. components not able to mutate slot nodes
    // 2. static slot content fails for hot-reloading
    // 非平台保留标签，不是 slot 标签，没有使用 inline-template
    if (
      !isPlatformReservedTag(node.tag) &&
      node.tag !== 'slot' &&
      node.attrsMap['inline-template'] == null
    ) {
      return
    }

    // 判断子节点是否是静态节点
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i]
      markStatic(child)
      // 如果存在子节点不是静态节点，那么父节点也不是静态节点
      if (!child.static) {
        node.static = false
      }
    }

    // 因为 else-if else 节点不存在父节点中，而是保存在 node.ifConditions[i].block 中，所以还需要对其进行判断标记
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        const block = node.ifConditions[i].block
        // 进行递归标记
        markStatic(block)
        if (!block.static) {
          node.static = false
        }
      }
    }
  }
}

// 设置静态根节点
function markStaticRoots (node: ASTNode, isInFor: boolean) {
  // 节点必须是元素节点
  if (node.type === 1) {
    if (node.static || node.once) {
      node.staticInFor = isInFor
    }
    // For a node to qualify as a static root, it should have children that
    // are not just static text. Otherwise the cost of hoisting out will
    // outweigh the benefits and it's better off to just always render it fresh.
    // 作为一个合格的静态根节点，它必须有子节点，这个子节点不能是只有一个静态文本的子节点，否则优化的成本大于收益
    // 定义静态跟节点：节点为静态节点，且存在子节点
    if (node.static && node.children.length && !(
      node.children.length === 1 &&
      node.children[0].type === 3
    )) {
      node.staticRoot = true
      return
    } else {
      node.staticRoot = false
    }

    // 对子节点进行标记 
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }
    // 对于使用 v-if 的节点，标记其 else elseif 的兄弟节点
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}

/**
 * 静态节点的判断：未使用动态指令、纯文本、使用 v-pre 标签
 * 静态节点是指在 ast 语法树中永远不会发生变化的节点，在第一次渲染之后每一次渲染都不会为其创建新节点，patch 过程也会跳过
 */
function isStatic (node: ASTNode): boolean {
  if (node.type === 2) { // 带变量的动态文本节点  expression 
    return false
  }
  if (node.type === 3) { // 不带变量的纯文本节点 text
    return true
  }
  // node.pre => v-pre
  return !!(node.pre || (
    !node.hasBindings && // no dynamic bindings 没有动态绑定
    !node.if && !node.for && // not v-if or v-for or v-else 没有绑定 if else for 指令
    !isBuiltInTag(node.tag) && // not a built-in 不是内置标签 component solt
    isPlatformReservedTag(node.tag) && // not a component 是平台保留标签，不能是组件 eg: 保留标签: <div></div> 组件标签 <App />
    !isDirectChildOfTemplateFor(node) && // 当前节点的父节点不能是带 v-for 指令的 template 标签
    Object.keys(node).every(isStaticKey) // 静态节点节点中不能存在动态节点才有的节点
  ))
}
// 检查节点的父节点是否是带 v-for 的 template 的节点
function isDirectChildOfTemplateFor (node: ASTElement): boolean {
  while (node.parent) {
    node = node.parent
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}
