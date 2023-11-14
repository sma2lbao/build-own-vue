import { nodeOps, TestElement } from "./node-ops";
import { patchProp } from "./patch-prop";
import { serializeInner } from "./serialize";
import { extend } from "@ovue/shared";
import {
  CreateAppFunction,
  createRenderer,
  RootRenderFunction,
  VNode,
} from "@ovue/runtime-core";

const { render: baseRender, createApp: baseCreateApp } = createRenderer(
  extend({ patchProp }, nodeOps)
);

export const render = baseRender as RootRenderFunction<TestElement>;
export const createApp = baseCreateApp as CreateAppFunction<TestElement>;

// convenience for one-off render validations
export function renderToString(vnode: VNode) {
  const root = nodeOps.createElement("div");
  render(vnode, root);
  return serializeInner(root);
}

export * from "./trigger-event";
export * from "./serialize";
export * from "./node-ops";
export * from "@ovue/runtime-core";
