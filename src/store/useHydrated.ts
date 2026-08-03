/**
 * 永続化(AsyncStorage)の復元完了を待つためのフック。
 *
 * 復元前の状態は「空のマンダラ + オンボーディング未完了」という初期値なので、
 * これを待たずに判定すると、既にデータを持っている既存ユーザーにも
 * 一瞬オンボーディングが立ち上がってしまう。必ず両ストアの復元を待つこと。
 */
import { useEffect, useState } from "react";

import { useAppStore } from "./useAppStore";
import { useNotificationStore } from "./useNotificationStore";
import { useOnboardingStore } from "./useOnboardingStore";

type PersistApi = {
  hasHydrated?: () => boolean;
  onFinishHydration?: (cb: () => void) => (() => void) | undefined;
};

function persistOf(store: unknown): PersistApi | undefined {
  return (store as { persist?: PersistApi }).persist;
}

/** persist を持たない構成では「復元済み」とみなす(テスト等で差し替えた場合) */
function isHydrated(store: unknown): boolean {
  const p = persistOf(store);
  return p?.hasHydrated ? p.hasHydrated() : true;
}

const STORES = [useAppStore, useOnboardingStore, useNotificationStore];

/** 全ストアの復元が終わったか */
export function useStoresHydrated(): boolean {
  const [ready, setReady] = useState(() => STORES.every(isHydrated));

  useEffect(() => {
    if (ready) return;
    const unsubs: (() => void)[] = [];
    const check = () => {
      if (STORES.every(isHydrated)) setReady(true);
    };
    for (const store of STORES) {
      const unsub = persistOf(store)?.onFinishHydration?.(check);
      if (unsub) unsubs.push(unsub);
    }
    // 購読を張る前に復元が終わっていた場合の取りこぼしを拾う
    check();
    return () => unsubs.forEach((u) => u());
  }, [ready]);

  return ready;
}
