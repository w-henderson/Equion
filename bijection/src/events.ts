/**
 * An event which occurs at the set level.
 */
export type SetEvent<T> = {
  set: string,
  deleted: boolean,
  value: T,
}

/**
 * An event which occurs at the subset level.
 */
export type SubsetEvent<T> = {
  set: string,
  subset: string,
  deleted: boolean,
  value: T,
}

/**
 * An event which occurs when a user types.
 */
export type TypingEvent = {
  subset: string,
  uid: string
}

/**
 * A pong event.
 */
export type PongEvent = {}

/**
 * All the events which can take place.
 */
export type Events = {
  pong: PongEvent;
  message: SubsetEvent<MessageData>;
  subset: SetEvent<SubsetData>;
  user: SetEvent<UserData>;
  voice: SetEvent<VoiceUserData>;
  typing: TypingEvent;
}

/**
 * A collection of event listeners.
 */
export type Listeners<E> = {
  [K in keyof E]?: Array<(e: E[K]) => void>;
}

/**
 * A class which handles event emission and listening.
 */
export class EventEmitter {
  private listeners: Listeners<Events> = {};

  public on<E extends keyof Events>(e: E, fn: (e: Events[E]) => void) {
    if (this.listeners[e] === undefined) this.listeners[e] = [];
    this.listeners[e]!.push(fn);
  }

  protected emit<E extends keyof Events>(e: E, data: Events[E]) {
    if (this.listeners[e] === undefined) return;
    this.listeners[e]!.forEach(fn => fn(data));
  }
}