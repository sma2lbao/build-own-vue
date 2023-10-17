## Effect 解析

### 测试用例

通过官方测试用例可以快速了解 effect 的主要作用。通过如下测试用例可以大体了解到 effect 主要作用是在 reactive 对象更新后，不需要再调用回调函数，它本身会自动更新。

```typescript
describe("reactivity/effect", () => {
  it("should observe basic properties", () => {
    let dummy;
    const counter = reactive({ num: 0 });
    effect(() => (dummy = counter.num));

    expect(dummy).toBe(0);
    counter.num = 7;
    expect(dummy).toBe(7);
  });
});
```

### effect 大体实现逻辑

入口文件在 reactivity/src/effect.ts 中 effect 方法中，该方法主要接收一个回调函数，如果该函数依赖 reactive 对象，该回调函数会在 reactive 对象更新时重新执行。

- 在 effect 方法中，首先会用回调函数 fn 生成 ReactiveEffect 对象，ReactiveEffect 类中最主要的方法是 run，该方法会在实例对象执行传入的回调，如果回调函数中如果有依赖到响应式对象就执行并且会被 proxy 拦截，在 reactive 的 proxy handler 中 get 拦截时会触发 effect 文件的 track 方法。

- 在 track 方法中，如果是 执行 ReactiveEffect run 方法触发 track 收集的，会执行搜集逻辑，在 ReactiveEffect run 中首先会对全局对象 shouldTrack 和 activeEffect 赋值，activeEffect 赋值本身，然后在 track 时可以将自身与依赖的代理对象相关联（代理对象可能会被多个 effect 引用，因此会用 Map 类型的全局对象 targetMap 缓存），另外 target key 不是直接与 effect 相关连，而是通过 dep 与 target key 相关连。同样也是是由于 target key 会多个 effect 相关连。Dep 类型中会使用 Set 存放 Effect。

- 在执行完 ReactiveEffect run 后，effect 就与 reactive target 存在关系，如果 effect 所依赖的 target 对象发生了更新，会触发 target 的 set 或其他写的拦截，在 base-handler.ts 可以看到修改初始对象 target 后，会触发 effect 文件的 trigger 方法来触发更新。

- 在 trigger 触发后可以通过传入的 target 对象及 key 获取 Dep ( targetMap -> map.get -> deps: Dep ); 在 Dep 中收集有 effect 对象，然后在执行 run 函数（重新收集依赖）。
