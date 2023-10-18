import { computed } from "../src/computed";
import { reactive } from "../src/reactive";
import { ref } from "../src/ref";

describe("reactivity/computed", () => {
  // it("should return updated value", () => {
  //   const value = reactive<{ foo?: number }>({});
  //   const cValue = computed(() => value.foo);
  //   expect(cValue.value).toBe(undefined);
  //   value.foo = 1;
  //   expect(cValue.value).toBe(1);
  // });

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

  it("should support setter", () => {
    const n = ref(1);
    const plusOne = computed({
      get: () => n.value + 1,
      set: (val) => {
        n.value = val - 1;
      },
    });

    expect(plusOne.value).toBe(2);
    n.value++;
    expect(plusOne.value).toBe(3);

    plusOne.value = 0;
    expect(n.value).toBe(-1);
  });
});
