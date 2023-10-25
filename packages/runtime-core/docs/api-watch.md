## watch 解析

watch 类型有多种，如：watchEffect、watchPostEffect、watchSyncEffect 及 watch；
大体可分开两类，一类是 watch；一类是 watchEffect 的补充，都是参数 flush 的不同变量。如 pre 对应 watchEffect；post 对应 watchPostEffect；sync 对应 watchSyncEffect；不同的区别是 job 执行的时机不同。

### watchEffect 解析

该 api 作用可见[官方文档](https://cn.vuejs.org/api/reactivity-core.html#watcheffect)

#### watchEffect 逻辑路径

watchEffect 和 watch 执行路径都是调用 doWatch；如以下代码可见，doWatch 大体逻辑如下：

- 首先会对 getter 做标准化处理，获取到 getter 是为了生成 effect 对象。

- 生成 clean 函数，方便用户可以调用 clean 函数来清除副作用。

- 组装 pre 类型 job，以及生成 scheduler 函数；该 job 内部会执行 effect.run 方法；。

- 利用 getter 和 scheduler 生成 effect 对象，由于 scheduler 是将 job 放入任务队列中执行，因此在 getter 所依赖的响应式对象更新时，会触发 scheduler 函数调用 --> queueJob 函数调用。

- 由于 scheduler 已经具备自动更新能力，因此需要在 doWatch 中绑定依赖，因此 watchEffect 需要调用 effect run 来收集依赖。

```typescript
function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  { immediate, deep, flush, onTrack, onTrigger }: WatchOptions = {}
): WatchStopHandle {
  // 声明getter
  let getter: () => any;
  let forceTrigger = false;
  let isMultiSource = false;

  // 赋值 getter
  if (isRef(source)) {
    getter = () => source.value;
  } else if (isReactive(source)) {
    getter = () => source;
  } else if (isFunction(source)) {
    if (cb) {
      // TODO
      getter = NOOP;
    } else {
      // watchEffect getter
      getter = () => {
        if (cleanup) {
          cleanup();
        }

        // TODO
        let res;
        try {
          res = source(onCleanup);
        } catch (err) {
          console.warn("未知错误");
        }
        return res;
      };
    }
  } else {
    getter = NOOP;
  }

  let cleanup: () => void;
  let onCleanup: OnCleanup = (fn: () => void) => {
    cleanup = effect.onStop = () => {
      let res;
      try {
        res = fn();
      } catch (error) {
        console.error(error);
      }
      return res;
    };
  };

  let oldValue: any = isMultiSource
    ? new Array((source as []).length).fill(INITIAL_WATCHER_VALUE)
    : INITIAL_WATCHER_VALUE;

  const job: SchedulerJob = () => {
    if (!effect.active) {
      return;
    }
    if (cb) {
      // watch(source, cb)
      // TODO
    } else {
      // watchEffect
      effect.run();
    }
  };

  job.allowRecurse = !!cb;

  let scheduler: EffectScheduler;
  if (flush === "sync") {
    scheduler = job as any;
  }
  // TODO
  //   else if (flush === "post") {
  //     // scheduler = () => queuePostRenderEffect(job, instance && instance.suspense);
  //   }
  else {
    job.pre = true;
    scheduler = () => queueJob(job);
  }

  const effect = new ReactiveEffect(getter, scheduler);
  if (cb) {
    // TODO
  } else if (flush === "post") {
    // TODO
  } else {
    effect.run();
  }

  const unwatch = () => {
    effect.stop();
  };

  // TODO
  return unwatch;
}
```

### watch 解析

#### watch 解析

TODO
