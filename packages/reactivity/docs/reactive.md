## reactive 解析

### reactive 测试用例

```typescript
describe("reactivity/reactive", () => {
  test("Object", () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(original)).toBe(false);
    // get
    expect(observed.foo).toBe(1);
    // has
    expect("foo" in observed).toBe(true);
    // ownKeys
    expect(Object.keys(observed)).toEqual(["foo"]);
  });
  // ...
  test("original value change should reflect in observed value (Object)", () => {
    const original: any = { foo: 1 };
    const observed = reactive(original);
    // set
    original.bar = 1;
    expect(original.bar).toBe(1);
    expect(observed.bar).toBe(1);
    // delete
    delete original.foo;
    expect("foo" in original).toBe(false);
    expect("foo" in observed).toBe(false);
  });
}
```

测试用例中会调用 reactive Api 来创建响应式对象，reactive 源码的位置在 reactivity/src/reactive.ts。在上面中的测试中主要测试 reactive api 会用 target 对象生成一个 Reactive 对象。其中 target 对象 和 reactive 对象不属于同一引用，但是改变其中任一对象都会修改另一对象的值。

### reactive 大体逻辑

> reative 文件中有四种不同的响应式对象，如 reactive、shallowReactive、readonly、shallowReadonly。当前主要根据 reative 流程阅读源码。

- 通过 reactive 返回一个代理对象，并将生成的代理对象放入全局对象 reactiveMap 中。

- 在 reactive 中通过 createReactiveObject 返回代理，其中主要会根据 target 判断是否需要生成 proxy 对象。如支持 'Object'、'Array'、'Map'、'Set'、'WeakMap'、'WeakSet'类型。其中'Object'、'Array'视为普通对象；'Map'、'Set'、'WeakMap'、'WeakSet'视为集合对象，需要特殊处理。

- 针对普通对象和集合对象的区分处理主要通过生成 Proxy 时传入不同的 handler。这个两个 handler 在 base-handler.ts 中实现。

- 在 base-handler.ts 文件主要在拦截代理对象属性后的具体实现，其中会有几种不同类型的 ReactiveHandler 处理器，但是大体上都是基于读写（'get'、'has'、'iterate'；'set'、'add'、'delete'、'clear'）相关逻辑处理。基本都是在代理对象进行读的时候收集依赖 effect；在对代理对象进行写的时候触发依赖 effect 的回调。

- 在 handler 对象上，get 的拦截是所有 reactive 类型都是共用的，在 get 方法中，首先会判断 key 是否为 ReactiveFlags 枚举值，该枚举是 reactive 对象用来判断具体类型的标志位，如 ReactiveFlags.IS_READONLY 为 true 时，代表 proxy target 对象为 readonly reactive 类型。然后会过滤 target 内置 Symbol 或不需要处理的内部 key。最后需要追踪剩余的属性 Key，具体实现在 effect.ts 及 dep.ts 中。在收集完依赖后判断通过 key 获取的 value 是否是对象，若是，则需要对返回值同样进行 reactive 处理。

- has 、iterate 的逻辑相对于 get 来说，都属于读拦截，实现上会比 get 更简单清晰，不过 has 及 iterate 对 集合对象和普通对象会有一定的区别。

- 在 hander 对象上，set 的拦截的首先会从 target 获取 oldValue，会用来传达给 effect 对象，然后需要判断 target 类型，如果 target 可以通过赋值运算赋值则会给 target 对象赋值，赋值完后，需要触发依赖回调。

- set、add、delete、clear 都属于写操作，在拦截处理时需要触发 effect 的回调。
