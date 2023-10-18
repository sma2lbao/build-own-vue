## Computed 解析

### Computed 测试用例

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
