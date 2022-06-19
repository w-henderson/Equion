/**
 * A class which handles event emission and listening.
 */
export class EventEmitter {
  private listeners: Listeners<Events> = {};

  /**
   * Registers a listener for an event.
   * 
   * @param e The event to listen for.
   * @param fn The function to call when the event occurs.
   */
  public on<E extends keyof Events>(e: E, fn: (e: Events[E]) => void) {
    if (this.listeners[e] === undefined) this.listeners[e] = [];
    this.listeners[e]!.push(fn);
  }

  /**
   * Removes a listener for an event.
   * 
   * @param e The event to remove the listener for.
   * @param fn The listener to remove.
   */
  public removeListener<E extends keyof Events>(e: E, fn: (e: Events[E]) => void) {
    if (this.listeners[e] === undefined) return;
    this.listeners[e]!.splice(this.listeners[e]!.indexOf(fn), 1);
  }

  /**
   * Emits an event to all listeners.
   * 
   * @param e The event to emit.
   * @param data The data to emit.
   */
  protected emit<E extends keyof Events>(e: E, data: Events[E]) {
    if (this.listeners[e] === undefined) return;
    this.listeners[e]!.forEach(fn => fn(data));
  }
}