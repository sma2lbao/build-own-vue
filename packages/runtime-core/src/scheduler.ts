import { NOOP, isArray } from "@ovue/shared";
import { ComponentInternalInstance } from "./component";

export interface SchedulerJob extends Function {
  id?: number;
  pre?: boolean;
  active?: boolean;
  computed?: boolean;

  allowRecurse?: boolean;

  ownerInstance?: ComponentInternalInstance;
}

export type SchedulerJobs = SchedulerJob | SchedulerJob[];

// 正在执行任务标志位
let isFlushing = false;
// 阻塞标志位
let isFlushPending = false;

// pre类型 和 普通类型的 job
const queue: SchedulerJob[] = [];
let flushIndex = 0;

// post 类型的 job
const pendingPostFlushCbs: SchedulerJob[] = [];
let activePostFlushCbs: SchedulerJob[] | null = null;
let postFlushIndex = 0;

const resolvedPromise = Promise.resolve() as Promise<any>;
let currentFlushPromise: Promise<void> | null = null;

type CountMap = Map<SchedulerJob, number>;

// 微任务阶段执行
export function nextTick<T = void, R = void>(
  this: T, // this 类型
  fn?: (this: T) => R
): Promise<Awaited<R>> {
  const p = currentFlushPromise || resolvedPromise;

  return fn ? p.then(this ? fn.bind(this) : fn) : p;
}

export function queuePostFlushCb(cb: SchedulerJobs) {
  if (!isArray(cb)) {
    if (
      !activePostFlushCbs ||
      !activePostFlushCbs.includes(
        cb,
        cb.allowRecurse ? postFlushIndex + 1 : postFlushIndex
      )
    ) {
      pendingPostFlushCbs.push(cb);
    }
  } else {
    // job 数组
    pendingPostFlushCbs.push(...cb);
  }
  queueFlush();
}

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

export function flushPreFlushCbs(
  seen?: CountMap,
  i = isFlushing ? flushIndex : 0
) {
  for (; i < queue.length; i++) {
    const cb = queue[i];
    if (cb && cb.pre) {
      queue.splice(i, 1);
      i--;
      cb();
    }
  }
}

export function flushPostFlushCbs(seen?: CountMap) {
  if (pendingPostFlushCbs.length) {
    // post 阶段任务去重
    const deduped = [...new Set(pendingPostFlushCbs)];
    pendingPostFlushCbs.length = 0;

    // 存在 post 阶段执行的任务没有执行完毕，需要添加 post 任务等待执行
    // #1947 already has active queue, nested flushPostFlushCbs call
    if (activePostFlushCbs) {
      activePostFlushCbs.push(...deduped);
      return;
    }

    activePostFlushCbs = deduped;

    activePostFlushCbs.sort((a, b) => getId(a) - getId(b));

    for (
      postFlushIndex = 0;
      postFlushIndex < activePostFlushCbs.length;
      postFlushIndex++
    ) {
      activePostFlushCbs[postFlushIndex]();
    }
    activePostFlushCbs = null;
    postFlushIndex = 0;
  }
}

/**
 * 执行任务队列入口，制造微任务队列
 */
function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    // 将阻塞 flush 标志位设为 true；在同步任务执行完后进行执行任务队列；
    // 在阻塞期间也可以一直增加队列任务
    isFlushPending = true;
    currentFlushPromise = resolvedPromise.then(flushJobs);
  }
}

function flushJobs(seen?: CountMap) {
  isFlushPending = false;
  isFlushing = true;
  // TODO

  // id从小到大排列 相同id job 时 pre job 排前面
  queue.sort(comparator);

  const check = NOOP;

  // 每次微任务执行阶段；都需要执行任务队列 queue 的任务

  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex];
      if (job && job.active !== false) {
        job();
      }
    }
  } finally {
    flushIndex = 0;
    queue.length = 0;

    // 直接执行 post 阶段的 job
    flushPostFlushCbs(seen);

    isFlushing = false;
    currentFlushPromise = null;

    if (queue.length || pendingPostFlushCbs.length) {
      flushJobs(seen);
    }
  }
}

/**
 * 二分查找 适合 id 升序排序
 * @param id
 * @returns
 */
function findInsertionIndex(id: number) {
  let start = flushIndex + 1;
  let end = queue.length;

  while (start < end) {
    // 无符号右移1位； 类似 / 2
    const middle = (start + end) >>> 1;
    const middleJobId = getId(queue[middle]);

    middleJobId < id ? (start = middle + 1) : (end = middle);
  }

  return start;
}

// 当 id 为空时，job id 为无穷大，即排列在最后
const getId = (job: SchedulerJob): number =>
  job.id == null ? Infinity : job.id;

// id 升序排列，相同id job pre为真的在前。
const comparator = (a: SchedulerJob, b: SchedulerJob): number => {
  const diff = getId(a) - getId(b);
  if (diff === 0) {
    if (a.pre && !b.pre) return -1;
    if (b.pre && !a.pre) return 1;
  }
  return diff;
};
