class Api {
  public getUid(): string {
    return "12345678-9abc-def0-1234-56789abcdef0";
  }

  public getUserByUid(uid: string): Promise<UserData> {
    return new Promise<UserData>((resolve, reject) => {
      switch (uid) {
        case "12345678-9abc-def0-1234-56789abcdef0": return resolve({
          id: "12345678-9abc-def0-1234-56789abcdef0",
          name: "William Henderson",
          image: "https://avatars.githubusercontent.com/u/58106291"
        });

        default: return resolve({
          id: uid,
          name: "Unknown User",
          image: "https://cdn.landesa.org/wp-content/uploads/default-user-image.png"
        });
      }
    });
  }
}

export default Api;