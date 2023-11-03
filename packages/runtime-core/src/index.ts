export type { CreateAppFunction } from "./api-create-app";
export { h } from "./h";

// Advanced render function utilities
export {
  createVNode,
  cloneVNode,
  mergeProps,
  isVNode,
  Fragment,
  Text,
  Comment,
  Static,
  type VNodeRef,
  type VNode,
} from "./vnode";

export * from "./renderer";

export const version = "1.0.0";
