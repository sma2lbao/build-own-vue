import {
  EMPTY_ARR,
  EMPTY_OBJ,
  PatchFlags,
  ShapeFlags,
  getGlobalThis,
  invokeArrayFns,
  isReservedProp,
} from "@ovue/shared";
import { CreateAppFunction, createAppAPI } from "./api-create-app";
import {
  ComponentInternalInstance,
  ComponentOptions,
  Data,
  createComponentInstance,
  setupComponent,
} from "./component";
import { RootHydrateFunction, createHydrationFunctions } from "./hydration";
import {
  Fragment,
  Static,
  Text,
  Comment,
  VNode,
  VNodeArrayChildren,
  VNodeHook,
  VNodeProps,
  cloneIfMounted,
  invokeVNodeHook,
  isSameVNodeType,
  normalizeVNode,
} from "./vnode";
import {
  SchedulerJob,
  flushPostFlushCbs,
  flushPreFlushCbs,
  invalidateJob,
  queueJob,
  queuePostFlushCb,
} from "./scheduler";
import { ReactiveEffect, pauseTracking, resetTracking } from "@ovue/reactivity";
import {
  renderComponentRoot,
  shouldUpdateComponent,
} from "./component-render-utils";
import { updateProps } from "./component-props";

export interface Renderer<HostElement = RendererElement> {
  render: RootRenderFunction<HostElement>;
  createApp: CreateAppFunction<HostElement>;
}

export interface RendererNode {
  [key: string]: any;
}

export interface RendererElement extends RendererNode {}

export interface Renderer<HostElement = RendererElement> {
  render: RootRenderFunction<HostElement>;
  createApp: CreateAppFunction<HostElement>;
}

// 暴露渲染器内部的对象，传递给 tree-shakeable
// 功能，以便它们可以与该文件解耦。缩短密钥以优化捆绑包大小。
export interface RendererInternals<
  HostNode = RendererNode,
  HostElement = RendererElement
> {
  p: PatchFn;
  um: UnmountFn;
  r: RemoveFn;
  m: MoveFn;
  mt: MountComponentFn;
  mc: MountChildrenFn;
  pc: PatchChildrenFn;
  pbc: PatchBlockChildrenFn;
  n: NextFn;
  o: RendererOptions<HostNode, HostElement>;
}

export interface HydrationRenderer extends Renderer<Element | ShadowRoot> {
  hydrate: RootHydrateFunction;
}

export type RootRenderFunction<HostElement = RendererElement> = (
  vnode: VNode | null,
  container: HostElement,
  isSVG?: boolean
) => void;

export type SetupRenderEffectFn = (
  instance: ComponentInternalInstance,
  initialVNode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentSuspense: null,
  isSVG: boolean,
  optimized: boolean
) => void;

export const enum MoveType {
  ENTER,
  LEAVE,
  REORDER,
}

type RemoveFn = (vnode: VNode) => void;

type MoveFn = (
  vnode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  type: MoveType,
  parentSuspense?: null
) => void;

type PatchChildrenFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean
) => void;

type PatchFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor?: RendererNode | null,
  parentComponent?: ComponentInternalInstance | null,
  parentSuspense?: null,
  isSVG?: boolean,
  slotScopeIds?: string[] | null,
  optimized?: boolean
) => void;

type NextFn = (vnode: VNode) => RendererNode | null;

type UnmountFn = (
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: null,
  doRemove?: boolean,
  optimized?: boolean
) => void;

export type MountComponentFn = (
  initialVNode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: null,
  isSVG: boolean,
  optimized: boolean
) => void;

type MountChildrenFn = (
  children: VNodeArrayChildren,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean,
  start?: number
) => void;

type ProcessTextOrCommentFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null
) => void;

type PatchBlockChildrenFn = (
  oldChildren: VNode[],
  newChildren: VNode[],
  fallbackContainer: RendererElement,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: null,
  isSVG: boolean,
  slotScopeIds: string[] | null
) => void;

type UnmountChildrenFn = (
  children: VNode[],
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: null,
  doRemove?: boolean,
  optimized?: boolean,
  start?: number
) => void;

export interface RendererOptions<
  HostNode = RendererNode,
  HostElement = RendererElement
> {
  patchProp(
    el: HostElement,
    key: string,
    prevValue: any,
    nextValue: any,
    isSVG?: boolean,
    prevChildren?: VNode<HostNode, HostElement>[],
    parentComponent?: ComponentInternalInstance | null,
    parentSuspense?: null,
    unmountChildren?: UnmountChildrenFn
  ): void;

  insert(el: HostNode, parent: HostElement, anchor?: HostNode | null): void;
  remove(el: HostNode): void;
  createElement(
    type: string,
    isSVG?: boolean,
    isCustomizedBuiltIn?: string,
    vnodeProps?: (VNodeProps & { [key: string]: any }) | null
  ): HostElement;
  createText(text: string): HostNode;
  createComment(text: string): HostNode;
  setText(node: HostNode, text: string): void;
  setElementText(node: HostElement, text: string): void;
  parentNode(node: HostNode): HostElement | null;
  nextSibling(node: HostNode): HostNode | null;
  querySelector?(selector: string): HostElement | null;
  setScopeId?(el: HostElement, id: string): void;
  cloneNode?(node: HostNode): HostNode;
  insertStaticContent?(
    content: string,
    parent: HostElement,
    anchor: HostNode | null,
    isSVG: boolean,
    start?: HostNode | null,
    end?: HostNode | null
  ): [HostNode, HostNode];
}

export function createRenderer<
  HostNode = RendererNode,
  HostElement = RendererElement
>(options: RendererOptions<HostNode, HostElement>) {
  return baseCreateRenderer<HostNode, HostElement>(options);
}

// overload 1: no hydration
function baseCreateRenderer<
  HostNode = RendererNode,
  HostElement = RendererElement
>(options: RendererOptions<HostNode, HostElement>): Renderer<HostElement>;

// overload 2: with hydration
function baseCreateRenderer(
  options: RendererOptions<Node, Element>,
  createHydrationFns: typeof createHydrationFunctions
): HydrationRenderer;

// 实现
function baseCreateRenderer(
  options: RendererOptions,
  createHydrationFns?: typeof createHydrationFunctions
): any {
  const target = getGlobalThis();
  const {
    patchProp: hostPatchProp,
    nextSibling: hostNextSibling,
    insert: hostInsert,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    createText: hostCreateText,
    createComment: hostCreateComment,
    createElement: hostCreateElement,
  } = options;

  target.__VUE__ = true;
  let hydrate;

  // 单节点对比
  const patch: PatchFn = (
    n1,
    n2,
    container,
    anchor = null,
    parentComponent = null,
    parentSuspense = null,
    isSVG = false,
    slotScopeIds = null,
    optimized = false
  ) => {
    if (n1 === n2) return;

    // 对比：n1 n2 不同type；卸载 老节点 n1 （相同需要 type 和 key 相同）
    if (n1 && !isSameVNodeType(n1, n2)) {
      anchor = getNextHostNode(n1);
      unmount(n1, parentComponent, parentSuspense, true);
      n1 = null;
    }

    if (n2.patchFlag === PatchFlags.BAIL) {
      optimized = false;
      n2.dynamicChildren = null;
    }

    const { type, ref, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container, anchor);
        break;
      case Comment:
        processCommentNode(n1, n2, container, anchor);
        break;
      case Static:
        console.info("暂未实现 Static !");
        break;
      case Fragment:
        console.info("暂未实现 Fragment !");
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          );
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          );
        } else {
          console.info("未知VNode type：", type);
        }
    }

    // if (ref != null && parentComponent) {
    //   setRef(ref, n1 && n1.ref, parentSuspense, n2 || n1, !n2);
    // }
  };

  // 处理 text 节点
  const processText: ProcessTextOrCommentFn = (n1, n2, container, anchor) => {
    if (n1 == null) {
      hostInsert(
        (n2.el = hostCreateText(n2.children as string)),
        container,
        anchor
      );
    } else {
      const el = (n2.el = n1.el!);
      if (n2.children !== n1.children) {
        hostSetText(el, n2.children as string);
      }
    }
  };

  // 处理注释节点
  const processCommentNode: ProcessTextOrCommentFn = (
    n1,
    n2,
    container,
    anchor
  ) => {
    if (n1 == null) {
      hostInsert(
        (n2.el = hostCreateComment((n2.children as string) || "")),
        container,
        anchor
      );
    } else {
      n2.el = n1.el;
    }
  };

  // 处理原生节点
  const processElement = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: null,
    isSVG: boolean,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => {
    isSVG = isSVG || n2.type === "svg";
    if (n1 == null) {
      // 渲染阶段 - 不存在旧节点
      mountElement(
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      );
    } else {
      patchElement(
        n1,
        n2,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      );
    }
  };

  // 处理 vue 组件
  const processComponent = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: null,
    isSVG: boolean,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => {
    n2.slotScopeIds = slotScopeIds;
    if (n1 == null) {
      if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        // keep alive； 需要调用 activate 钩子函数
      } else {
        mountComponent(
          n2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
          optimized
        );
      }
    } else {
      updateComponent(n1, n2, optimized);
    }
  };

  // 比对原生组件
  const patchElement = (
    n1: VNode,
    n2: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: null,
    isSVG: boolean,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => {
    const el = (n2.el = n1.el!);
    let { patchFlag, dynamicChildren, dirs } = n2;

    patchFlag |= n1.patchFlag & PatchFlags.FULL_PROPS;
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    let vnodeHook: VNodeHook | undefined | null;

    // TODO：onVnodeBeforeUpdate beforeUpdate HOOK
    // disable recurse in beforeUpdate hooks
    // parentComponent && toggleRecurse(parentComponent, false);
    // if ((vnodeHook = newProps.onVnodeBeforeUpdate)) {
    //   invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
    // }

    // parentComponent && toggleRecurse(parentComponent, true);

    if (!optimized) {
      // full diff
      patchChildren(
        n1,
        n2,
        el,
        null,
        parentComponent,
        parentSuspense,
        false,
        slotScopeIds,
        false
      );
    }
    if (patchFlag > 0) {
      if (patchFlag & PatchFlags.FULL_PROPS) {
        // element props 存在 动态的 keys, 需要全diff
        patchProps(
          el,
          n2,
          oldProps,
          newProps,
          parentComponent,
          parentSuspense,
          isSVG
        );
      } else {
        // element 存在动态 class 绑定
        if (patchFlag & PatchFlags.CLASS) {
          // TODO
        }
        // TODO style

        // props
        if (patchFlag & PatchFlags.PROPS) {
          const propsToUpdate = n2.dynamicProps!;
          for (let i = 0; i < propsToUpdate.length; i++) {
            const key = propsToUpdate[i];
            const prev = oldProps[key];
            const next = newProps[key];

            if (next !== prev || key === "value") {
              hostPatchProp(
                el,
                key,
                prev,
                next,
                isSVG,
                n1.children as VNode[],
                parentComponent,
                parentSuspense,
                unmountChildren
              );
            }
          }
        }
      }

      // Text
      if (patchFlag & PatchFlags.TEXT) {
        if (n1.children !== n2.children) {
          hostSetElementText(el, n2.children as string);
        }
      }
    } else if (!optimized && dynamicChildren == null) {
      patchProps(
        el,
        n2,
        oldProps,
        newProps,
        parentComponent,
        parentSuspense,
        isSVG
      );
    }

    if ((vnodeHook = newProps.onVnodeBeforeUpdate) || dirs) {
      queuePostFlushCb(() => {
        vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, n1, n2);
      });
    }
  };

  // 渲染原生节点
  const mountElement = (
    vnode: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: null,
    isSVG: boolean,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => {
    let el: RendererElement;
    let vnodeHook: VNodeHook | undefined | null;
    const { type, props, shapeFlag } = vnode;

    el = vnode.el = hostCreateElement(
      vnode.type as string,
      isSVG,
      props && props.is,
      props
    );

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, vnode.children as string);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(
        vnode.children as VNodeArrayChildren,
        el,
        null,
        parentComponent,
        parentSuspense,
        isSVG && type !== "foreignObject",
        slotScopeIds,
        optimized
      );
    }

    hostInsert(el, container, anchor);
  };

  // 渲染 vue 组件
  const mountComponent: MountComponentFn = (
    initialVNode,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    isSVG,
    optimized
  ) => {
    const instance: ComponentInternalInstance = (initialVNode.component =
      createComponentInstance(initialVNode, parentComponent, parentSuspense));

    setupComponent(instance);

    setupRenderEffect(
      instance,
      initialVNode,
      container,
      anchor,
      parentSuspense,
      isSVG,
      optimized
    );
  };

  const setupRenderEffect: SetupRenderEffectFn = (
    instance,
    initialVNode,
    container,
    anchor,
    parentSuspense,
    isSVG,
    optimized
  ) => {
    const componentUpdateFn = () => {
      if (!instance.isMounted) {
        let vnodeHook: VNodeHook | null | undefined;
        const { el, props } = initialVNode;
        const { bm, m, parent } = instance;
        const isAsyncWrapperVNode = !!(initialVNode.type as any).__asyncLoader;
        if (bm) {
          invokeArrayFns(bm);
        }
        if (
          !isAsyncWrapperVNode &&
          (vnodeHook = props && props.onVnodeBeforeMount)
        ) {
          invokeVNodeHook(vnodeHook, parent, initialVNode);
        }

        const subTree = (instance.subTree = renderComponentRoot(instance));
        patch(
          null,
          subTree,
          container,
          anchor,
          instance,
          parentSuspense,
          isSVG
        );
        initialVNode.el = subTree.el;

        if (m) {
          queuePostFlushCb(m);
        }

        if (
          !isAsyncWrapperVNode &&
          (vnodeHook = props && props.onVnodeMounted)
        ) {
          const scopedInitialVNode = initialVNode;
          queuePostFlushCb(() =>
            invokeVNodeHook(vnodeHook!, parent, scopedInitialVNode)
          );
        }

        instance.isMounted = true;

        initialVNode = container = anchor = null as any;
      } else {
        // 更新组件
        let { next, bu, u, parent, vnode } = instance;
        let originNext = next;
        let vnodeHook: VNodeHook | null | undefined;

        if (next) {
          next.el = vnode.el;
          updateComponentPreRender(instance, next, optimized);
        } else {
          next = vnode;
        }

        if (bu) {
          invokeArrayFns(bu);
        }

        if ((vnodeHook = next.props && next.props.onVnodeBeforeUpdate)) {
          invokeVNodeHook(vnodeHook, parent, next, vnode);
        }
      }
    };

    const effect = (instance.effect = new ReactiveEffect(
      componentUpdateFn,
      () => queueJob(update),
      instance.scope
    ));

    const update: SchedulerJob = (instance.update = () => effect.run());
    update.id = instance.uid;

    update();
  };

  const updateComponent = (n1: VNode, n2: VNode, optimized: boolean) => {
    const instance = (n2.component = n1.component)!;
    if (shouldUpdateComponent(n1, n2, optimized)) {
      instance.next = n2;
      invalidateJob(instance.update);
      instance.update();
    } else {
      // 没有更新
      n2.el = n1.el;
      instance.vnode = n2;
    }
  };

  const updateComponentPreRender = (
    instance: ComponentInternalInstance,
    nextVNode: VNode,
    optimized: boolean
  ) => {
    nextVNode.component = instance;
    const prevProps = instance.vnode.props;
    instance.vnode = nextVNode;
    instance.next = null;
    updateProps(instance, nextVNode.props, prevProps, optimized);
    // updateSlots(instance, nextVNode.children, optimized)

    pauseTracking();

    flushPreFlushCbs();
    resetTracking();
  };

  // 卸载
  const unmount: UnmountFn = (
    vnode,
    parentComponent,
    parentSuspense,
    doRemove = false,
    optimized = false
  ) => {
    const {
      type,
      props,
      ref,
      children,
      dynamicChildren,
      shapeFlag,
      patchFlag,
      dirs,
    } = vnode;
    // 重置 ref
    if (ref != null) {
      // setRef(ref, null, parentSuspense, vnode, true);
    }

    // TODO deactivate HOOK

    if (shapeFlag & ShapeFlags.COMPONENT) {
      unmountComponent(vnode.component!, parentSuspense, doRemove);
    } else {
      // TODO
    }
  };

  // 卸载组件
  const unmountComponent = (
    instance: ComponentInternalInstance,
    parentSuspense: null,
    doRemove?: boolean
  ) => {
    const { bum, scope, update, subTree, um } = instance;

    // beforeUnmount hook
    if (bum) {
      invokeArrayFns(bum);
    }

    scope.stop();

    if (update) {
      update.active = false;
      unmount(subTree, instance, parentSuspense, doRemove);
    }

    // unmounted hook
    if (um) {
      queuePostFlushCb(um);
    }

    queuePostFlushCb(() => {
      instance.isUnmounted = true;
    });
  };

  const getNextHostNode: NextFn = (vnode) => {
    if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
      return getNextHostNode(vnode.component!.subTree);
    }
    return hostNextSibling((vnode.anchor || vnode.el)!);
  };

  // 比对数组节点
  const patchChildren: PatchChildrenFn = (
    n1,
    n2,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds,
    optimized = false
  ) => {
    const c1 = n1 && n1.children;
    const prevShapeFlag = n1 ? n1.shapeFlag : 0;
    const c2 = n2.children;

    const { patchFlag, shapeFlag } = n2;
    // fast path
    if (patchFlag > 0) {
      if (patchFlag & PatchFlags.KEYED_FRAGMENT) {
        patchKeyedChildren(
          c1 as VNode[],
          c2 as VNodeArrayChildren,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        );
        return;
      } else if (patchFlag & PatchFlags.UNKEYED_FRAGMENT) {
        patchUnkeyedChildren(
          c1 as VNode[],
          c2 as VNodeArrayChildren,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        );
        return;
      }
    }

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 新节点是文本节点的情况
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 上个节点是数组的情况，需要对上个节点做卸载
        unmountChildren(c1 as VNode[], parentComponent, parentSuspense);
      }

      if (c2 !== c1) {
        hostSetElementText(container, c2 as string);
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 新旧子节点都是数组
          patchKeyedChildren(
            c1 as VNode[],
            c2 as VNodeArrayChildren,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          );
        } else {
          unmountChildren(c1 as VNode[], parentComponent, parentSuspense, true);
        }
      } else {
        // 新节点可能是数组或空节点
        // 旧节点可能是 文本 或者 空节点
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(container, "");
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(
            c2 as VNodeArrayChildren,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          );
        }
      }
    }
  };

  // 渲染数组节点
  const mountChildren: MountChildrenFn = (
    children,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds,
    optimized,
    start = 0
  ) => {
    for (let i = start; i < children.length; i++) {
      const child = (children[i] = optimized
        ? cloneIfMounted(children[i] as VNode)
        : normalizeVNode(children[i]));
      // 循环引用
      patch(
        null,
        child,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      );
    }
  };

  // 卸载数组节点
  const unmountChildren: UnmountChildrenFn = (
    children,
    parentComponent,
    parentSuspense,
    doRemove = false,
    optimized = false,
    start = 0
  ) => {
    for (let i = start; i < children.length; i++) {
      unmount(
        children[i],
        parentComponent,
        parentSuspense,
        doRemove,
        optimized
      );
    }
  };

  // 对比没有 key 的数组节点；
  // 取新老数组最小长度， 从左到右依次新老节点对比；
  // 可以复用则复用，不能复用则mount
  // 循环完后，旧数组有没对比的直接卸载，新数组没有对比的就创建
  const patchUnkeyedChildren = (
    c1: VNode[],
    c2: VNodeArrayChildren,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: null,
    isSVG: boolean,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => {
    c1 = c1 || EMPTY_ARR;
    c2 = c2 || EMPTY_ARR;
    const oldLength = c1.length;
    const newLength = c2.length;
    const commonLength = Math.min(oldLength, newLength);
    let i;
    for (i = 0; i < commonLength; i++) {
      const nextChild = (c2[i] = optimized
        ? cloneIfMounted(c2[i] as VNode)
        : normalizeVNode(c2[i]));
      patch(
        c1[i],
        nextChild,
        container,
        null,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      );
    }
    if (oldLength > newLength) {
      // 存在多余的旧节点
      unmountChildren(
        c1,
        parentComponent,
        parentSuspense,
        true,
        false,
        commonLength
      );
    } else {
      // 存在新节点没有渲染
      mountChildren(
        c2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized,
        commonLength
      );
    }
  };

  // 对比有key的数组节点 - diff 算法 （最长序列算法）
  const patchKeyedChildren = (
    c1: VNode[],
    c2: VNodeArrayChildren,
    container: RendererElement,
    parentAnchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: null,
    isSVG: boolean,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => {
    let i = 0;
    const l2 = c2.length;
    let e1 = c1.length - 1;
    let e2 = l2 - 1;

    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = (c2[i] = optimized
        ? cloneIfMounted(c2[i] as VNode)
        : normalizeVNode(c2[i]));
      if (isSameVNodeType(n1, n2)) {
        patch(
          n1,
          n2,
          container,
          null,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        );
      } else {
        break;
      }
      i++;
    }

    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = (c2[e2] = optimized
        ? cloneIfMounted(c2[e2] as VNode)
        : normalizeVNode(c2[e2]));
      if (isSameVNodeType(n1, n2)) {
        patch(
          n1,
          n2,
          container,
          null,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        );
      } else {
        break;
      }
      e1--;
      e2--;
    }

    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1;
        const anchor = nextPos < l2 ? (c2[nextPos] as VNode).el : parentAnchor;
        while (i <= e2) {
          patch(
            null,
            (c2[i] = optimized
              ? cloneIfMounted(c2[i] as VNode)
              : normalizeVNode(c2[i])),
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          );
          i++;
        }
      }
    } else if (i > e2) {
      while (i <= e1) {
        unmount(c1[i], parentComponent, parentSuspense, true);
        i++;
      }
    } else {
      const s1 = i;
      const s2 = i;

      const keyToNewIndexMap: Map<string | number | symbol, number> = new Map();
      for (i = s2; i <= e2; i++) {
        const nextChild = (c2[i] = optimized
          ? cloneIfMounted(c2[i] as VNode)
          : normalizeVNode(c2[i]));
        if (nextChild.key != null) {
          keyToNewIndexMap.set(nextChild.key, i);
        }
      }

      let j;
      let patched = 0;
      const toBePatched = e2 - s2 + 1;
      let moved = false;
      let maxNewIndexSoFar = 0;

      const newIndexToOldIndexMap = new Array(toBePatched);
      for (i = 0; i < toBePatched; i++) {
        newIndexToOldIndexMap[i] = 0;
      }
      for (i = s1; i <= e1; i++) {
        const prevChild = c1[i];
        if (patched >= toBePatched) {
          unmount(prevChild, parentComponent, parentSuspense, true);
          continue;
        }

        let newIndex;
        if (prevChild.key != null) {
          newIndex = keyToNewIndexMap.get(prevChild.key);
        } else {
          for (j = s2; j <= e2; j++) {
            if (
              newIndexToOldIndexMap[j - s2] === 0 &&
              isSameVNodeType(prevChild, c2[j] as VNode)
            ) {
              newIndex = j;
              break;
            }
          }
        }
        if (newIndex === undefined) {
          unmount(prevChild, parentComponent, parentSuspense, true);
        } else {
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }

          patch(
            prevChild,
            c2[newIndex] as VNode,
            container,
            null,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          );
          patched++;
        }
      }

      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : EMPTY_ARR;
      j = increasingNewIndexSequence.length - 1;
      for (i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = s2 + 1;
        const nextChild = c2[nextIndex] as VNode;
        const anchor =
          nextIndex + 1 < l2 ? (c2[nextIndex + 1] as VNode).el : parentAnchor;
        if (newIndexToOldIndexMap[i] === 0) {
          patch(
            null,
            nextChild,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          );
        } else if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            move(nextChild, container, anchor, MoveType.REORDER);
          } else {
            j--;
          }
        }
      }
    }
  };

  const move: MoveFn = (
    vnode,
    container,
    anchor,
    moveType,
    parentSuspense = null
  ) => {
    const { el, type, children, shapeFlag } = vnode;
    if (shapeFlag & ShapeFlags.COMPONENT) {
      move(vnode.component!.subTree, container, anchor, moveType);
      return;
    }
    hostInsert(el!, container, anchor);
  };

  // 对比 props
  const patchProps = (
    el: RendererElement,
    vnode: VNode,
    oldProps: Data,
    newProps: Data,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: null,
    isSVG: boolean
  ) => {
    if (oldProps !== newProps) {
      if (oldProps !== EMPTY_OBJ) {
        for (const key in oldProps) {
          if (!isReservedProp(key) && !(key in newProps)) {
            hostPatchProp(
              el,
              key,
              oldProps[key],
              null,
              isSVG,
              vnode.children as VNode[],
              parentComponent,
              parentSuspense,
              unmountChildren
            );
          }
        }
      }
      for (const key in newProps) {
        if (isReservedProp(key)) continue;
        const next = newProps[key];
        const prev = oldProps[key];

        if (next !== prev && key !== "value") {
          hostPatchProp(
            el,
            key,
            prev,
            next,
            isSVG,
            vnode.children as VNode[],
            parentComponent,
            parentSuspense,
            unmountChildren
          );
        }
      }
      if ("value" in newProps) {
        hostPatchProp(el, "value", oldProps.value, newProps.value);
      }
    }
  };

  const render: RootRenderFunction = (vnode, container, isSVG) => {
    if (vnode === null) {
      // 卸载阶段
      console.info("暂未实现卸载阶段");
    } else {
      patch(
        container._vnode || null,
        vnode,
        container,
        null,
        null,
        null,
        isSVG
      );
    }
    flushPreFlushCbs();
    flushPostFlushCbs();
    container._vnode = vnode;
  };

  return {
    render,
    hydrate,
    createApp: createAppAPI(render, hydrate),
  };
}

// 最长序列
function getSequence(arr: number[]): number[] {
  // 复制 arr 数组
  const p = arr.slice();
  const result = [0]; // 存放的是 arr 的下标
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1]; // 下标数组 result 最后一个的下标
      if (arr[j] < arrI) {
        // 如果当前的值 大于 下标组最后一个下标对应的值
        p[i] = j; // 把 下标数组 result 的最后一个下标 赋值给 数组 p 的 当前 i 位置
        result.push(i); // 并把当前 i 下标推入到 result 中
        continue;
      }
      // 如果当前的值 小于或等于 下标组最后一个下标对应的值
      u = 0;
      v = result.length - 1; // 下标组最后一个下标的索引
      while (u < v) {
        c = (u + v) >> 1; // 未运算，等同于除2；即 u -> v 的中位数
        if (arr[result[c]] < arrI) {
          // 当前的值 大于 中位数对应下标的arr的值；意味着需要比较后半段的坐标对应的值
          u = c + 1;
        } else {
          // 否则比较前半段的坐标对应值
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        // 当前值小于 找到的最终坐标对应的值
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
