import { NO, extend, isFunction, isObject } from "@ovue/shared";
import {
  Component,
  ComponentInternalInstance,
  ConcreteComponent,
  Data,
  getExposeProxy,
} from "./component";
import { ComponentOptions, RuntimeCompilerOptions } from "./component-options";
import {
  ComponentCustomProperties,
  ComponentPublicInstance,
} from "./component-public-instance";
import { Directive } from "./directives";
import { VNode, createVNode } from "./vnode";
import { version } from ".";
import { RootRenderFunction } from "./renderer";
import { RootHydrateFunction } from "./hydration";

export interface App<HostElement = any> {
  version: string;
  config: AppConfig;

  // use<Options extends unknown[]>(
  //   plugin: Plugin<Options>,
  //   ...options: Options
  // ): this;
  // use<Options>(plugin: Plugin<Options>, options: Options): this;

  // mixin(mixin: ComponentOptions): this;
  // component(name: string): Component | undefined;
  // component(name: string, component: Component): this;
  // directive(name: string): Directive | undefined;
  // directive(name: string, directive: Directive): this;
  mount(
    rootContainer: HostElement | string,
    isHydrate?: boolean,
    isSVG?: boolean
  ): ComponentPublicInstance;
  unmount(): void;
  // provide<T>(key: InjectionKey<T> | string, value: T): this;

  runWithContext<T>(fn: () => T): T;

  _uid: number;
  _component: ConcreteComponent;
  _props: Data | null;
  _container: HostElement | null;
  _context: AppContext;
  _instance: ComponentInternalInstance | null;
}

export type OptionMergeFunction = (to: unknown, from: unknown) => any;

export interface AppConfig {
  readonly isNativeTag?: (tag: string) => boolean;

  performance: boolean;
  optionMergeStrategies: Record<string, OptionMergeFunction>;
  globalProperties: ComponentCustomProperties & Record<string, any>;
  errorHandler?: (
    err: unknown,
    instance: ComponentPublicInstance | null,
    info: string
  ) => void;
  warnHandler?: (
    msg: string,
    instance: ComponentPublicInstance | null,
    trace: string
  ) => void;

  compilerOptions: RuntimeCompilerOptions;
}

type PluginInstallFunction<Options> = Options extends unknown[]
  ? (app: App, ...options: Options) => any
  : (app: App, options: Options) => any;

export type Plugin<Options = any[]> =
  | (PluginInstallFunction<Options> & {
      install?: PluginInstallFunction<Options>;
    })
  | {
      install: PluginInstallFunction<Options>;
    };

export type CreateAppFunction<HostElement> = (
  rootComponent: Component,
  rootProps?: Data | null
) => App<HostElement>;

export interface AppContext {
  app: App;
  config: AppConfig;
  mixins: ComponentOptions[];
  components: Record<string, Component>;
  directives: Record<string, Directive>;
  provides: Record<string | symbol, any>;

  optionsCache: WeakMap<ComponentOptions, any>;

  propsCache: WeakMap<ConcreteComponent, any>;

  emitsCache: WeakMap<ConcreteComponent, any>;

  // TODO

  /**
   * HMR only
   * @internal
   */
  reload?: () => void;

  /**
   * v2 compat only
   */
  filters?: Record<string, Function>;
}

let uid = 0;

/**
 * 用于在使用“inject()”时识别当前应用程序
 * `app.runWithContext()`
 */
export let currentApp: App<unknown> | null = null;

export function createAppAPI<HostElement>(
  render: RootRenderFunction<HostElement>,
  hydrate?: RootHydrateFunction
): CreateAppFunction<HostElement> {
  return function createApp(rootComponent, rootProps = null) {
    if (!isFunction(rootComponent)) {
      rootComponent = extend({}, rootComponent);
    }

    if (!rootProps != null && !isObject(rootProps)) {
      rootProps = null;
    }

    const context = createAppContext();

    // const installedPlugins = new Set();

    let isMounted = false;

    const app: App = (context.app = {
      _uid: uid++,
      _component: rootComponent as ConcreteComponent,
      _props: rootProps,
      _container: null,
      _context: context,
      _instance: null,

      version,

      get config() {
        return context.config;
      },

      set config(v) {},

      mount(
        rootContainer: HostElement,
        isHydrate?: boolean,
        isSVG?: boolean
      ): any {
        if (!isMounted) {
          const vnode = createVNode(rootComponent, rootProps);

          vnode.appContext = context;

          if (isHydrate && hydrate) {
            hydrate(vnode as VNode<Node, Element>, rootContainer as any);
          } else {
            render(vnode, rootContainer, isSVG);
          }

          isMounted = true;
          app._container = rootContainer;
          return getExposeProxy(vnode.component!) || vnode.component!.proxy;
        }
      },

      unmount() {
        if (isMounted) {
          render(null, app._container);
          delete app._container.__vue_app__;
        }
      },

      runWithContext(fn) {
        currentApp = app;
        try {
          return fn();
        } finally {
          currentApp = null;
        }
      },
    });

    return app;
  };
}

export function createAppContext(): AppContext {
  return {
    app: null as any,
    config: {
      isNativeTag: NO,
      performance: false,
      globalProperties: {},
      optionMergeStrategies: {},
      errorHandler: undefined,
      warnHandler: undefined,
      compilerOptions: {},
    },
    mixins: [],
    components: {},
    directives: {},
    provides: Object.create(null),
    optionsCache: new WeakMap(),
    propsCache: new WeakMap(),
    emitsCache: new WeakMap(),
  };
}
