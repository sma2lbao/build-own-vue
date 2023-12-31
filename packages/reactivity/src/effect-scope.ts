import { ReactiveEffect } from "./effect";

let activeEffectScope: EffectScope | undefined;

export function getCurrentScope() {
  return activeEffectScope;
}

export function recordEffectScope(
  effect: ReactiveEffect,
  scope: EffectScope | undefined = activeEffectScope
) {
  if (scope && scope.active) {
    scope.effects.push(effect);
  }
}

export class EffectScope {
  private _active = true;

  effects: ReactiveEffect[] = [];

  cleanups: (() => void)[] = [];

  parent: EffectScope | undefined;

  scopes: EffectScope[] | undefined;

  private index: number | undefined;

  constructor(public detached = false) {
    this.parent = activeEffectScope;
    if (!detached && activeEffectScope) {
      this.index =
        (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(
          this
        ) - 1;
    }
  }

  get active() {
    return this._active;
  }

  run<T>(fn: () => T): T | undefined {
    if (this._active) {
      const currentEffectScope = activeEffectScope;
      try {
        activeEffectScope = this;
        return fn();
      } finally {
        activeEffectScope = currentEffectScope;
      }
    }
  }

  on() {
    activeEffectScope = this;
  }

  off() {
    activeEffectScope = this.parent;
  }

  stop(fromParent?: boolean) {
    if (this._active) {
      let i, l;
      for (i = 0, l = this.effects.length; i < l; i++) {
        this.effects[i].stop();
      }
      for (i = 0, l = this.cleanups.length; i < l; i++) {
        this.cleanups[i]();
      }
      if (this.scopes) {
        for (i = 0, l = this.scopes.length; i < l; i++) {
          this.scopes[i].stop(true);
        }
      }

      if (!this.detached && this.parent && !fromParent) {
        const last = this.parent.scopes!.pop();
        if (last && last !== this) {
          this.parent.scopes![this.index!] = last;
          last.index = this.index!;
        }
      }

      this.parent = undefined;
      this._active = false;
    }
  }
}
