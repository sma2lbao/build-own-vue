import {
  CreateAppFunction,
  HydrationRenderer,
  Renderer,
  RootRenderFunction,
  createRenderer,
} from "@ovue/runtime-core";
import { extend, isFunction, isString } from "@ovue/shared";
import { nodeOps } from "./node-ops";
import { patchProp } from "./patch-prop";

const rendererOptions = extend({ patchProp }, nodeOps);

export const createApp = ((...args) => {
  const app = ensureRenderer().createApp(...args);

  const { mount } = app;

  app.mount = (containerOrSelector: Element | ShadowRoot | string): any => {
    const container = normalizeContainer(containerOrSelector);
    if (!container) return;
    const component = app._component;
    if (!isFunction(component) && !component.render && !component.template) {
      component.template = container.innerHTML;
    }

    container.innerHTML = "";
    const proxy = mount(container, false, container instanceof SVGAElement);
    if (container instanceof Element) {
      container.removeAttribute("v-cloak");
      container.setAttribute("data-v-app", "");
    }
    return proxy;
  };

  return app;
}) as CreateAppFunction<Element>;

export const render = ((...args) => {
  ensureRenderer().render(...args);
}) as RootRenderFunction<Element | ShadowRoot>;

// 惰性创建渲染器 - 这使得核心渲染器逻辑 tree-shakable 如果用户仅从 Vue 导入 reactivity utilities。
let renderer: Renderer<Element | ShadowRoot> | HydrationRenderer;
function ensureRenderer() {
  return (
    renderer ||
    (renderer = createRenderer<Node, Element | ShadowRoot>(rendererOptions))
  );
}

function normalizeContainer(
  container: Element | ShadowRoot | string
): Element | null {
  if (isString(container)) {
    const res = document.querySelector(container);
    return res;
  }
  return container as any;
}

export * from "@ovue/runtime-core";
