import {
  flushPreFlushCbs,
  nextTick,
  queueJob,
  queuePostFlushCb,
} from "../src/scheduler";

describe("scheduler", () => {
  it("nextTick", async () => {
    const calls: string[] = [];
    const dummyThen = Promise.resolve().then();
    const job1 = () => {
      calls.push("job1");
    };
    const job2 = () => {
      calls.push("job2");
    };
    nextTick(job1);
    job2();

    expect(calls.length).toBe(1);
    await dummyThen;
    // job1 will be pushed in nextTick
    expect(calls.length).toBe(2);
    expect(calls).toMatchObject(["job2", "job1"]);
  });

  describe("queueJob", () => {
    it("basic usage", async () => {
      const calls: string[] = [];
      const job1 = () => {
        calls.push("job1");
      };
      const job2 = () => {
        calls.push("job2");
      };
      queueJob(job1);
      queueJob(job2);
      expect(calls).toEqual([]);
      await nextTick();
      expect(calls).toEqual(["job1", "job2"]);
    });

    it("should insert jobs in ascending order of job's id when flushing", async () => {
      const calls: string[] = [];
      const job1 = () => {
        calls.push("job1");

        queueJob(job2);
        queueJob(job3);
      };

      const job2 = () => {
        calls.push("job2");
        queueJob(job4);
        queueJob(job5);
      };
      job2.id = 10;

      const job3 = () => {
        calls.push("job3");
      };
      job3.id = 1;

      const job4 = () => {
        calls.push("job4");
      };

      const job5 = () => {
        calls.push("job5");
      };

      queueJob(job1);

      expect(calls).toEqual([]);
      await nextTick();
      expect(calls).toEqual(["job1", "job3", "job2", "job4", "job5"]);
    });

    it("should dedupe queued jobs", async () => {
      const calls: string[] = [];
      const job1 = () => {
        calls.push("job1");
      };
      const job2 = () => {
        calls.push("job2");
      };
      queueJob(job1);
      queueJob(job2);
      queueJob(job1);
      queueJob(job2);
      expect(calls).toEqual([]);
      await nextTick();
      expect(calls).toEqual(["job1", "job2"]);
    });

    it("queueJob while flushing", async () => {
      const calls: string[] = [];
      const job1 = () => {
        calls.push("job1");
        // job2 will be executed after job1 at the same tick
        queueJob(job2);
      };
      const job2 = () => {
        calls.push("job2");
      };
      queueJob(job1);

      await nextTick();
      expect(calls).toEqual(["job1", "job2"]);
    });
  });

  describe("pre flush jobs", () => {
    it("queueJob inside preFlushCb", async () => {
      const calls: string[] = [];
      const job1 = () => {
        calls.push("job1");
      };
      const cb1 = () => {
        // queueJob in postFlushCb
        calls.push("cb1");
        queueJob(job1);
      };
      cb1.pre = true;

      queueJob(cb1);
      await nextTick();
      expect(calls).toEqual(["cb1", "job1"]);
    });

    it("queueJob & preFlushCb inside preFlushCb", async () => {
      const calls: string[] = [];
      const job1 = () => {
        calls.push("job1");
      };
      job1.id = 1;

      const cb1 = () => {
        calls.push("cb1");
        queueJob(job1);
        // cb2 should execute before the job
        queueJob(cb2);
      };
      cb1.pre = true;

      const cb2 = () => {
        calls.push("cb2");
      };
      cb2.pre = true;
      cb2.id = 1;

      queueJob(cb1);
      await nextTick();
      expect(calls).toEqual(["cb1", "cb2", "job1"]);
    });

    it("preFlushCb inside queueJob", async () => {
      const calls: string[] = [];
      const job1 = () => {
        // the only case where a pre-flush cb can be queued inside a job is
        // when updating the props of a child component. This is handled
        // directly inside `updateComponentPreRender` to avoid non atomic
        // cb triggers (#1763)
        queueJob(cb1);
        queueJob(cb2);
        flushPreFlushCbs();
        calls.push("job1");
      };
      const cb1 = () => {
        calls.push("cb1");
        // a cb triggers its parent job, which should be skipped
        queueJob(job1);
      };
      cb1.pre = true;
      const cb2 = () => {
        calls.push("cb2");
      };
      cb2.pre = true;

      queueJob(job1);
      await nextTick();
      expect(calls).toEqual(["cb1", "cb2", "job1"]);
    });

    // #3806
    it("queue preFlushCb inside postFlushCb", async () => {
      const spy = vi.fn();
      const cb = () => spy();
      cb.pre = true;
      queuePostFlushCb(() => {
        queueJob(cb);
      });
      await nextTick();
      expect(spy).toHaveBeenCalled();
    });
  });
});
