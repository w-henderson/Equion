import React from "react";
import "../styles/UserInfo.scss";

import toast from "react-hot-toast";
import ApiContext from "../api/ApiContext";
import { DEFAULT_PROFILE_IMAGE } from "../api/Api";

import Modal from "./Modal";
import { EditButton, LogOutButton, SaveButton } from "./Svg";

interface UserInfoProps {
  id: string | null,
  refreshCallback: () => void,
  hideCallback: () => void,
}

interface UserInfoState {
  loading: boolean,
  editing: boolean,
  data: UserData | null,
  displayName: string,
  about: string,
  imageFile: File | null,
  displayedImage: string,
}

/**
 * Component for the user information modal.
 * 
 * This also allows the current user to edit their information.
 */
class UserInfo extends React.Component<UserInfoProps, UserInfoState> {
  context!: React.ContextType<typeof ApiContext>;
  fileInput: React.RefObject<HTMLInputElement>;

  /**
   * Initializes the component.
   */
  constructor(props: UserInfoProps) {
    super(props);

    this.state = {
      loading: false,
      editing: false,
      data: null,
      displayName: "",
      about: "",
      imageFile: null,
      displayedImage: ""
    };

    this.fileInput = React.createRef();

    this.logout = this.logout.bind(this);
    this.setEditing = this.setEditing.bind(this);
    this.save = this.save.bind(this);
    this.close = this.close.bind(this);
    this.changedImage = this.changedImage.bind(this);
  }

  /**
   * If the component is supposed to be showing a user, but their data has not been loaded, load it.
   */
  componentDidUpdate() {
    if (!this.state.loading && this.props.id !== null && (this.state.data === null || this.state.data.uid !== this.props.id)) {
      this.setState({ loading: true }, () => {
        if (this.props.id === null) return;

        this.context!.client.user(this.props.id).then(user => this.setState({ data: user, loading: false }));
      });
    }
  }

  /**
   * Logs out the current user.
   */
  logout() {
    toast.promise(this.context!.client.logout(), {
      loading: "Signing out...",
      success: "Signed out!",
      error: (e) => `${e}`,
    }).then(() => this.context!.clearAuth());
  }

  /**
   * Enables editing mode for the shown user.
   */
  setEditing() {
    this.setState({
      editing: true,
      displayName: this.state.data?.displayName || "",
      about: this.state.data?.bio || "",
      imageFile: null,
      displayedImage: this.context!.getFileURL(this.state.data?.image)
    });
  }

  /**
   * Saves the edited data.
   */
  save() {
    toast.promise(
      this.context!.client.updateUser(this.state.displayName, this.state.about, this.state.imageFile || undefined)
        .then(() => this.context!.client.user(this.props.id ?? "")),
      {
        loading: "Updating profile...",
        success: "Profile updated!",
        error: (e) => `${e}`,
      })
      .then(user => {
        this.props.refreshCallback();
        this.setState({
          data: user,
          editing: false,
        });
      });
  }

  /**
   * Closes the modal.
   */
  close() {
    if (!this.state.loading) {
      this.props.hideCallback();
      this.setState({
        editing: false,
        displayName: "",
        about: "",
        imageFile: null,
        displayedImage: ""
      });
    }
  }

  /**
   * Changes the image file for the profile picture.
   */
  changedImage(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const url = URL.createObjectURL(e.target.files[0]);
      this.setState({
        imageFile: e.target.files[0],
        displayedImage: url
      });
    } else {
      this.setState(state => {
        URL.revokeObjectURL(state.displayedImage);

        return {
          ...state,
          imageFile: null,
          displayedImage: this.context!.getFileURL(this.state.data?.image)
        };
      });
    }
  }

  /**
   * Renders the component.
   */
  render() {
    const showData = !this.state.loading && this.state.data !== null;

    if (!this.state.editing) {
      return (
        <Modal
          visible={this.props.id !== null}
          close={this.close}
          className="UserInfo">

          {showData && this.state.data!.uid === this.context!.getUid() &&
            <>
              <div className="logoutButton" onClick={this.logout}>
                <LogOutButton />
              </div>

              <div className="editButton" onClick={this.setEditing}>
                <EditButton />
              </div>
            </>
          }

          {showData &&
            <>
              <div className={this.state.data!.online || this.state.data!.uid === this.context?.getUid() ? "image online" : "image"}>
                <img src={this.context!.getFileURL(this.state.data!.image)} alt="Profile" />
              </div>

              <h1>{this.state.data!.displayName}</h1>
              <span className="username">@{this.state.data!.username}</span>

              <div>
                <h2>About</h2>
                {this.state.data!.bio || <i>Not available.</i>}
              </div>
            </>
          }

          {!showData &&
            <>
              <div className="image">
                <img src={DEFAULT_PROFILE_IMAGE} alt="Profile" />
              </div>

              <h1 className="placeholder">Loading...</h1>

              <div>
                <p className="placeholder">Loading (this text is long)...</p>
                <p className="placeholder">Loading short...</p>
                <p className="placeholder">Loading medium......</p>
              </div>
            </>
          }
        </Modal>
      );
    } else {
      return (
        <Modal
          visible={this.props.id !== null}
          close={this.close}
          className="UserInfo editing">

          <div className="editButton" onClick={this.save}>
            <SaveButton />
          </div>

          <div className="image online">
            <img
              src={this.state.displayedImage}
              alt="Profile"
              onClick={() => this.fileInput.current?.click()} />
          </div>

          <input
            type="text"
            value={this.state.displayName}
            onChange={e => this.setState({ displayName: e.target.value })} />

          <input
            type="file"
            accept="image/*"
            hidden={true}
            ref={this.fileInput}
            onChange={this.changedImage} />

          <span className="username" title="You cannot currently change your username">@{this.state.data?.username}</span>

          <div>
            <h2>About</h2>

            <textarea
              value={this.state.about}
              onChange={e => this.setState({ about: e.target.value })}
              placeholder="Write something about yourself" />
          </div>
        </Modal>
      );
    }
  }
}

UserInfo.contextType = ApiContext;

export default UserInfo;