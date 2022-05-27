export enum NotificationLevel {
  None,
  MentionsOnly,
  All
}

/**
 * Handles notifications.
 */
class Notifier {
  notificationLevel: NotificationLevel;
  getFileURL: (id?: string) => string;
  mentionsMe: (message: string) => boolean;

  audio: HTMLAudioElement;

  /**
   * Create a new Notifier instance with the given callbacks.
   */
  constructor(getFileURL: (id?: string) => string, mentionsMe: (message: string) => boolean) {
    this.notificationLevel = NotificationLevel.MentionsOnly;
    this.getFileURL = getFileURL;
    this.mentionsMe = mentionsMe;

    this.audio = new Audio("/audio/equion-01.ogg");
    this.audio.load();
  }

  /**
   * Sends a notification to the user of the given message.
   * 
   * If the message does not warrant a notification at the current notification level, nothing happens.
   */
  notify(message: MessageData) {
    if (this.notificationLevel === NotificationLevel.None) return;
    if (this.notificationLevel === NotificationLevel.MentionsOnly && !this.mentionsMe(message.text)) return;

    this.audio.load();
    this.audio.play();
  }
}

export default Notifier;