## scheduler 源码解析

### scheduler 解析

scheduler 主要是以任务队列操作为主，同时将任务大致分成 pre 类型任务、普通类型任务、post 类型任务；

#### nextTick api

```typescript
// 微任务阶段执行
export function nextTick<T = void, R = void>(
  this: T, // this 类型
  fn?: (this: T) => R
): Promise<Awaited<R>> {
  const p = currentFlushPromise || resolvedPromise;

  return fn ? p.then(this ? fn.bind(this) : fn) : p;
}
```

根据上面代码可知，nextTick 返回的是 Promise 类型，代码回调函数会在同步任务执行完成后再执行回调函数。

#### queueJob api

queueJob 主要是收集 pre 类型任务和普通任务，可知 pre 类型任务和普通类型任务共用全局对象 queue；但是他们的执行入口是分开的；代表它们的执行时机不同。

```typescript
export function queueJob(job: SchedulerJob) {
  // 重复数据删除搜索默认使用 Array.includes() 的 startIndex 参数，搜索索引包含正在运行的当前作业，因此它无法再次递归地触发自身。
  // 如果作业是 watch() 回调，则搜索将从 +1 索引开始，以允许它递归地触发自身 - 用户有责任确保它不会陷入无限循环。
  if (
    !queue.length ||
    !queue.includes(
      job,
      isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex
    )
  ) {
    //  isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex 代表正在执行任务队列，同时如果job支持递归，
    // 需要从当前执行位置+1(排除递归job本身)
    if (job.id == null) {
      queue.push(job);
    } else {
      // 将 job 加入到合适的位置（id 升序）
      queue.splice(findInsertionIndex(job.id), 0, job);
    }
    // 每次增加任务job，都需要执行下任务队列
    queueFlush();
  }
}
```

#### queuePostFlushCb api

该方法是接收 post 类型任务，并将其加入到全局变量 pendingPostFlushCbs 中。该方法没有对其排序。排序是在执行阶段。

#### flushPreFlushCbs api

该方法提供了在执行普通任务前执行 pre 类型任务的入口。

#### flushPostFlushCbs api

该方法提供了在执行普通任务前执行 post 类型任务的入口。在该方法中对任务做了去重和排序。
