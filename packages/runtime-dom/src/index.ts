import { CreateAppFunction } from "@ovue/runtime-core";

export const createApp = ((...args) => {
  const app = ensureRenderer().createApp(...args);

  const { mount } = app;

  return app;
}) as CreateAppFunction<Element>;

// 惰性创建渲染器 - 这使得核心渲染器逻辑 tree-shakable 如果用户仅从 Vue 导入 reactivity utilities。

let renderer: Renderer<Element | ShadowRoot> | HydrationRenderer;

function ensureRenderer() {
  return (
    renderer ||
    (renderer = createRenderer<Node, Element | ShadowRoot>(rendererOptions))
  );
}
