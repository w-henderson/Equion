export enum NotificationLevel {
  None,
  MentionsOnly,
  All
}

class Notifier {
  notificationLevel: NotificationLevel;
  getFileURL: (id?: string) => string;
  mentionsMe: (message: string) => boolean;

  audio: HTMLAudioElement;

  constructor(getFileURL: (id?: string) => string, mentionsMe: (message: string) => boolean) {
    this.notificationLevel = NotificationLevel.MentionsOnly;
    this.getFileURL = getFileURL;
    this.mentionsMe = mentionsMe;

    this.audio = new Audio("/audio/equion-01.ogg");
    this.audio.load();
  }

  notify(message: MessageData) {
    if (this.notificationLevel === NotificationLevel.None) return;
    if (this.notificationLevel === NotificationLevel.MentionsOnly && !this.mentionsMe(message.text)) return;

    this.audio.load();
    this.audio.play();
  }
}

export default Notifier;