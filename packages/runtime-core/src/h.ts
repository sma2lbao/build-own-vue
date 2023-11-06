import { isArray, isObject } from "@ovue/shared";
import {
  Fragment,
  VNode,
  VNodeArrayChildren,
  VNodeProps,
  createVNode,
  isVNode,
} from "./vnode";
import { RawSlots } from "./component-slots";
import { Component, ConcreteComponent } from "./component";
import { ComponentOptions } from "./component-options";

/*
// type only
h('div')

// type + props
h('div', {})

// type + omit props + children
// Omit props does NOT support named slots
h('div', []) // array
h('div', 'foo') // text
h('div', h('br')) // vnode
h(Component, () => {}) // default slot

// type + props + children
h('div', {}, []) // array
h('div', {}, 'foo') // text
h('div', {}, h('br')) // vnode
h(Component, {}, () => {}) // default slot
h(Component, {}, {}) // named slots

// named slots without props requires explicit `null` to avoid ambiguity
h(Component, null, {})
**/

type RawProps = VNodeProps & {
  // used to differ from a single VNode object as children
  __v_isVNode?: never;
  // used to differ from Array children
  [Symbol.iterator]?: never;
} & Record<string, any>;

type RawChildren =
  | string
  | number
  | boolean
  | VNode
  | VNodeArrayChildren
  | (() => any);

// element
export function h(type: string, children?: RawChildren): VNode;
export function h(
  type: string,
  props?: RawProps | null,
  children?: RawChildren | RawSlots
): VNode;

// text/comment
export function h(
  type: typeof Text | typeof Comment,
  children?: string | number | boolean
): VNode;
export function h(
  type: typeof Text | typeof Comment,
  props?: null,
  children?: string | number | boolean
): VNode;

// fragment
export function h(type: typeof Fragment, children?: VNodeArrayChildren): VNode;
export function h(
  type: typeof Fragment,
  props?: RawProps | null,
  children?: VNodeArrayChildren
): VNode;

// catch-all for generic component types
export function h(type: Component, children?: RawChildren): VNode;

// concrete component
export function h<P>(
  type: ConcreteComponent | string,
  children?: RawChildren
): VNode;
export function h<P>(
  type: ConcreteComponent<P> | string,
  props?: (RawProps & P) | ({} extends P ? null : never),
  children?: RawChildren
): VNode;

// component without props
export function h<P>(
  type: Component<P>,
  props?: (RawProps & P) | null,
  children?: RawChildren | RawSlots
): VNode;

// exclude `defineComponent` constructors
export function h<P>(
  type: ComponentOptions<P>,
  props?: (RawProps & P) | ({} extends P ? null : never),
  children?: RawChildren | RawSlots
): VNode;

// Actual implementation
export function h(type: any, propsOrChildren?: any, children?: any): VNode {
  const l = arguments.length;
  if (l === 2) {
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      // single vnode without props
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      }
      // props without children
      return createVNode(type, propsOrChildren);
    } else {
      // omit props
      return createVNode(type, null, propsOrChildren);
    }
  } else {
    if (l > 3) {
      children = Array.prototype.slice.call(arguments, 2);
    } else if (l === 3 && isVNode(children)) {
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }
}
