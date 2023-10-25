import { ReactiveFlags, Ref, isProxy, isRef } from "@ovue/reactivity";
import { RendererElement, RendererNode } from "./renderer";
import { Component, ComponentInternalInstance, Data } from "./component";
import { ComponentPublicInstance } from "./component-public-instance";
import { AppContext } from "./api-create-app";
import { RawSlots } from "./component-slots";
import { DirectiveBinding } from "./directives";
import {
  PatchFlags,
  ShapeFlags,
  extend,
  isArray,
  isFunction,
  isObject,
  isOn,
  isString,
  normalizeClass,
  normalizeStyle,
} from "@ovue/shared";
import {
  currentRenderingInstance,
  currentScopeId,
} from "./component-render-context";

export const Fragment = Symbol.for("v-fgt") as any as {
  __isFragment: true;
  new (): {
    $props: VNodeProps;
  };
};
export const Text = Symbol.for("v-txt");
export const Comment = Symbol.for("v-cmt");
export const Static = Symbol.for("v-stc");

export const InternalObjectKey = `__vInternal`;

export type VNodeRef =
  | string
  | Ref
  | ((
      ref: Element | ComponentPublicInstance | null,
      refs: Record<string, any>
    ) => void);

export type VNodeTypes =
  | string
  | VNode
  | Component
  | typeof Text
  | typeof Static
  | typeof Comment
  | typeof Fragment;
// | typeof Teleport
// | typeof TeleportImpl
// | typeof Suspense
// | typeof SuspenseImpl

export interface VNode<
  HostNode = RendererNode,
  HostElement = RendererElement,
  ExtraProps = { [key: string]: any }
> {
  // vnode类型标记
  __v_isVNode: true;

  [ReactiveFlags.SKIP]: true;

  type: VNodeTypes;

  props: (VNodeProps & ExtraProps) | null;
  key: string | number | symbol | null;
  ref: VNodeNormalzedRef | null;

  scopeId: string | null;
  slotScopeIds: string[] | null;
  children: VNodeNormalizedChildren;
  component: ComponentInternalInstance | null;
  dirs: DirectiveBinding[] | null;
  // transition: TransitionHooks<HostElement> | null;

  el: HostNode | null;
  anchor: HostNode | null;
  target: HostElement | null;
  targetAnchor: HostNode | null;

  staticCount: number;

  // suspense: SuspenseBoundary | null;

  ssContent: VNode | null;

  ssFallback: VNode | null;

  shapeFlag: number;
  patchFlag: number;

  dynamicProps: string[] | null;

  dynamicChildren: VNode[] | null;

  // application root node only
  appContext: AppContext | null;

  ctx: ComponentInternalInstance | null;

  // 新增 memo/v-memo ;性能优化
  memo?: any[];

  isCompatRoot?: true;

  ce?: (instance: ComponentInternalInstance) => void;
}

type VNodeChildAtom =
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | void;

export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>;

export type VNodeChild = VNodeChildAtom | VNodeArrayChildren;

export type VNodeNormalizedRefAtom = {
  i: ComponentInternalInstance;
  r: VNodeRef;
  k?: string; // setup ref key
  f?: boolean; // refInFor marker
};

export type VNodeNormalzedRef =
  | VNodeNormalizedRefAtom
  | VNodeNormalizedRefAtom[];

type VNodeMountHook = (vnode: VNode) => void;
type VNodeUpdateHook = (vnoe: VNode, oldVNode: VNode) => void;

export type VNodeHook =
  | VNodeMountHook
  | VNodeUpdateHook
  | VNodeMountHook[]
  | VNodeUpdateHook[];

export type VNodeProps = {
  key?: string | number | symbol;
  ref?: VNodeRef;
  ref_for?: boolean;
  ref_key?: string;

  // vnode hooks
  onVnodeBeforeMount?: VNodeMountHook | VNodeMountHook[];
  onVnodeMounted?: VNodeMountHook | VNodeMountHook[];
  onVnodeBeforeUpdate?: VNodeUpdateHook | VNodeUpdateHook[];
  onVnodeUpdated?: VNodeUpdateHook | VNodeUpdateHook[];
  onVnodeBeforeUnmount?: VNodeMountHook | VNodeMountHook[];
  onVnodeUnmounted?: VNodeMountHook | VNodeMountHook[];
};

export type VNodeNormalizedChildren =
  | string
  | VNodeArrayChildren
  | RawSlots
  | null;

export function normalizeChildren(vnode: VNode, children: unknown) {}

const normalizeKey = ({ key }: VNodeProps): VNode["key"] =>
  key != null ? key : null;

const normalizeRef = ({
  ref,
  ref_key,
  ref_for,
}: VNodeProps): VNodeNormalizedRefAtom | null => {
  if (typeof ref === "number") {
    ref = "" + ref;
  }
  return (
    ref != null
      ? isString(ref) || isRef(ref) || isFunction(ref)
        ? { i: currentRenderingInstance, r: ref, k: ref_key, f: !!ref_for }
        : ref
      : null
  ) as any;
};

export function cloneVNode<T, U>(
  vnode: VNode<T, U>,
  extraProps?: (Data & VNodeProps) | null,
  mergeRef = false
): VNode<T, U> {
  const { props, ref, patchFlag, children } = vnode;
  const mergedProps = extraProps ? mergeProps(props || {}, extraProps) : props;
  const cloned: VNode<T, U> = {
    __v_isVNode: true,
    __v_skip: true,
    type: vnode.type,
    props: mergedProps,
    key: mergedProps && normalizeKey(mergedProps),
    ref:
      extraProps && extraProps.ref
        ? // #2078 in the case of <component :is="vnode" ref="extra"/>
          // if the vnode itself already has a ref, cloneVNode will need to merge
          // the refs so the single vnode can be set on multiple refs
          mergeRef && ref
          ? isArray(ref)
            ? ref.concat(normalizeRef(extraProps)!)
            : [ref, normalizeRef(extraProps)!]
          : normalizeRef(extraProps)
        : ref,
    scopeId: vnode.scopeId,
    slotScopeIds: vnode.slotScopeIds,
    children: children,
    target: vnode.target,
    targetAnchor: vnode.targetAnchor,
    staticCount: vnode.staticCount,
    shapeFlag: vnode.shapeFlag,

    patchFlag:
      extraProps && vnode.type !== Fragment
        ? patchFlag === -1
          ? PatchFlags.FULL_PROPS
          : patchFlag | PatchFlags.FULL_PROPS
        : patchFlag,

    dynamicProps: vnode.dynamicProps,
    dynamicChildren: vnode.dynamicChildren,
    appContext: vnode.appContext,
    dirs: vnode.dirs,
    // transition: vnode.transition,

    component: vnode.component,
    // suspense: vnode.suspense,
    ssContent: vnode.ssContent && cloneVNode(vnode.ssContent),
    ssFallback: vnode.ssFallback && cloneVNode(vnode.ssFallback),
    el: vnode.el,
    anchor: vnode.anchor,
    ctx: vnode.ctx,
    ce: vnode.ce,
  };
  return cloned;
}

export const createVNode = _createVNode;
/** TODO: | ClassComponent | typeof NULL_DYNAMIC_COMPONENT */
function _createVNode(
  type: VNodeTypes,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  patchFlag: number = 0,
  dynamicProps: string[] | null = null,
  isBlockNode: false
): VNode {
  if (!type) {
    type = Comment;
  }

  if (isVNode(type)) {
    // createVNode receiving an existing vnode. This happens in cases like
    // <component :is="vnode"/>
    const cloned = cloneVNode(type, props, true /* mergeRef: true */);
    if (children) {
      normalizeChildren(cloned, children);
    }

    cloned.patchFlag |= PatchFlags.BAIL;
    return cloned;
  }

  // TODO classComponent

  // class & style normalization
  if (props) {
    props = guardReactiveProps(props)!;
    let { class: klass, style } = props;
    if (klass && !isString(klass)) {
      props.class = normalizeClass(klass);
    }
    if (isObject(style)) {
      if (isProxy(style) && !isArray(style)) {
        style = extend({}, style);
      }
      props.style = normalizeStyle(style);
    }
  }

  // encode the vnode type information into a bitmap
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : isFunction(type)
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0;

  return createBaseVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps,
    shapeFlag,
    isBlockNode,
    true
  );
}

function createBaseVNode(
  type: VNodeTypes /**  | ClassComponent | typeof NULL_DYNAMIC_COMPONENT  */,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  patchFlag = 0,
  dynamicProps: string[] | null = null,
  shapeFlag = type === Fragment ? 0 : ShapeFlags.ELEMENT,
  isBlockNode = false,
  needFullChildrenNormalization = false
) {
  const vnode = {
    __v_isVNode: true,
    __v_skip: true,
    type,
    props,
    key: props && normalizeKey(props),
    ref: props && normalizeRef(props),
    scopeId: currentScopeId,
    slotScopeIds: null,
    children,
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    // transition: null,
    el: null,
    anchor: null,
    target: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag,
    patchFlag,
    dynamicProps,
    dynamicChildren: null,
    appContext: null,
    ctx: currentRenderingInstance,
  } as VNode;

  if (needFullChildrenNormalization) {
    normalizeChildren(vnode, children);
  } else if (children) {
    vnode.shapeFlag |= isString(children)
      ? ShapeFlags.TEXT_CHILDREN
      : ShapeFlags.ARRAY_CHILDREN;
  }

  // TODO  isBlockTreeEnabled

  return vnode;
}

export { createBaseVNode as createElementVNode };

export function isVNode(value: any): value is VNode {
  return value ? value.__v_isVNode === true : false;
}

export function guardReactiveProps(props: (Data & VNodeProps) | null) {
  if (!props) return null;
  return isProxy(props) || InternalObjectKey in props
    ? extend({}, props)
    : props;
}

export function mergeProps(...args: (Data & VNodeProps)[]) {
  const ret: Data = {};
  for (let i = 0; i < args.length; i++) {
    const toMerge = args[i];
    for (const key in toMerge) {
      if (key === "class") {
        if (ret.class !== toMerge.class) {
          ret.class = normalizeClass([ret.class, toMerge.class]);
        }
      } else if (key === "style") {
        ret.style = normalizeStyle([ret.style, toMerge.style]);
      } else if (isOn(key)) {
      } else if (key !== "") {
        ret[key] = toMerge[key];
      }
    }
  }

  return ret;
}
