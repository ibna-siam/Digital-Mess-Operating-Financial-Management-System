export type SyncTopic =
  | 'expenses'
  | 'meals'
  | 'bazar'
  | 'bills'
  | 'members'
  | 'dashboard'
  | 'ledger'
  | 'settlements'
  | 'notifications'
  | 'documents'
  | 'utilities'
  | 'audit-logs';

export type SyncListener = (payload?: any) => void;

class SyncEventEmitter {
  private listeners: Map<string, Set<SyncListener>> = new Map();

  public on(topic: SyncTopic | string, listener: SyncListener): () => void {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic)!.add(listener);
    return () => this.off(topic, listener);
  }

  public off(topic: SyncTopic | string, listener: SyncListener): void {
    const set = this.listeners.get(topic);
    if (set) {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(topic);
      }
    }
  }

  public emit(topic: SyncTopic | string, payload?: any): void {
    const set = this.listeners.get(topic);
    if (set) {
      set.forEach((fn) => {
        try {
          fn(payload);
        } catch (err) {
          console.error(`[SyncEvents] Error executing listener for "${topic}":`, err);
        }
      });
    }
  }
}

export const syncEvents = new SyncEventEmitter();
