import { RendererInternals } from "./renderer";
import { VNode } from "./vnode";

export type RootHydrateFunction = (
  vnode: VNode<Node, Element>,
  container: (Element | ShadowRoot) & { _vnode?: VNode }
) => void;

export function createHydrationFunctions(
  rendererInternals: RendererInternals<Node, Element>
) {
  // TODO
}
