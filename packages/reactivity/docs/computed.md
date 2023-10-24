## computed 解析

### computed 测试用例

```typescript
it("should compute lazily", () => {
  const value = reactive<{ foo?: number }>({});
  const getter = vi.fn(() => value.foo);
  const cValue = computed(getter);

  // lazy
  expect(getter).not.toHaveBeenCalled();

  expect(cValue.value).toBe(undefined);
  expect(getter).toHaveBeenCalledTimes(1);

  // should not compute again
  cValue.value;
  expect(getter).toHaveBeenCalledTimes(1);

  // should not compute until needed
  value.foo = 1;
  expect(getter).toHaveBeenCalledTimes(1);

  // now it should compute
  expect(cValue.value).toBe(1);
  expect(getter).toHaveBeenCalledTimes(2);

  // should not compute again
  cValue.value;
  expect(getter).toHaveBeenCalledTimes(2);
});
```

### computed 大体逻辑

computed 大体和 ref + effect 结合使用实现，它和 ref 的区别是有缓存的能力， computed 的缓存能力是由 dirty 标志及是否为 SSR 控制。

- computed 可以只接收 getter 也可以接收 setter 和 getter 方法，在实例化 ComputedRefImpl 时，会统一成 getter 和 setter 的入参。

- 实例化 ComputedImpl 对象时会先生成 effect，用来绑定 getter 回调函数的响应式对象。在响应式变量更新时可以自动计算。

- setter 的处理相对简单，在调用 computed setter 时会直接调用 setter，在 setter 中，如果有其他响应式对象依赖，会进行依赖收集，在下次获取 compute 值时更新。

- getter 的处理同样也是先收集依赖，如果数据没有过期，即 getter 所有依赖的响应性对象没有发生变化，就返回缓存。
