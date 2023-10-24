## ref 解析

### ref 测试用例

通过测试用例可以清楚知道，ref 是用来解决 reactive 不支持基础类型的响应式的问题。

```typescript
it("should be reactive", () => {
  const a = ref(1);
  let dummy;
  const fn = vi.fn(() => {
    dummy = a.value;
  });
  effect(fn);
  expect(fn).toHaveBeenCalledTimes(1);
  expect(dummy).toBe(1);
  a.value = 2;
  expect(fn).toHaveBeenCalledTimes(2);
  expect(dummy).toBe(2);
  // same value should not trigger
  a.value = 2;
  expect(fn).toHaveBeenCalledTimes(2);
});
```

### ref 大体逻辑

- 通过阅读 reactivity/src/ref.ts 的源码，大体流程较为清晰，ref 主要返回了 RefImpl 实例对象。

- 在 RefImpl 实例对象中，主要提供 value 属性的 get 和 set 方法，在这个两个方法主要的作用除了获取和设置 value 外，还有收集 effect 到 dep 中 和 触发 dep 中的 effect 的作用，与 reactive 区别是，当 target 是基础类型时，不需要返回代理 proxy 对象，因为 ref 的 value 的 get 和 set 方法可以 收集 和 触发 effect；

- 在 RefImpl 的 get 和 set 会调用 trackRefValue 、triggerRefValue；逻辑相对简单明了，具体作用可看当前源码注释。
