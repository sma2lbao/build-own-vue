import { ReactiveFlags } from "@ovue/reactivity";
import { RendererElement, RendererNode } from "./renderer";
import { Component } from "./component";

export const Text = Symbol.for("v-txt");
export const Comment = Symbol.for("v-cmt");
export const Static = Symbol.for("v-stc");

export type VNodeTypes =
  | string
  | VNode
  | Component
  | typeof Text
  | typeof Comment
  | typeof Static;

export interface VNode<
  HostNode = RendererNode,
  HostElement = RendererElement,
  ExtraProps = { [key: string]: any }
> {
  __v_isVNode: true;

  [ReactiveFlags.SKIP]: true;

  type: VNodeTypes;
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
