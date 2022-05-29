import React from "react";
import "../styles/UserInfo.scss";

import toast from "react-hot-toast";
import ApiContext from "../api/ApiContext";
import { DEFAULT_PROFILE_IMAGE } from "../api/Api";

import Modal from "./Modal";

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
    if (!this.state.loading && this.props.id !== null && this.state.data === null) {
      this.setState({ loading: true }, () => {
        if (this.props.id === null) return;

        this.context!.getUserByUid(this.props.id).then(user => this.setState({ data: user, loading: false }));
      });
    }
  }

  /**
   * Logs out the current user.
   */
  logout() {
    toast.promise(this.context!.logout(), {
      loading: "Signing out...",
      success: "Signed out!",
      error: (e) => `${e}`,
    });
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
      this.context!.updateUser(this.state.displayName, this.state.about, this.state.imageFile || undefined).then(() => this.context!.getUserByUid(this.props.id ?? "")),
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
        data: null,
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
    if (!this.state.editing) {
      return (
        <Modal
          visible={this.props.id !== null}
          close={this.close}
          className="UserInfo">

          {this.state.data?.uid === this.context!.getUid() &&
            <>
              <div className="logoutButton" onClick={this.logout}>
                <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12H19M19 12L16 15M19 12L16 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19 6V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="editButton" onClick={this.setEditing}>
                <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.0207 5.82839L15.8491 2.99996L20.7988 7.94971L17.9704 10.7781M13.0207 5.82839L3.41405 15.435C3.22652 15.6225 3.12116 15.8769 3.12116 16.1421V20.6776H7.65669C7.92191 20.6776 8.17626 20.5723 8.3638 20.3847L17.9704 10.7781M13.0207 5.82839L17.9704 10.7781" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </>
          }

          {this.state.data !== null &&
            <>
              <img src={this.context!.getFileURL(this.state.data.image)} alt="Profile" />

              <h1>{this.state.data.displayName}</h1>
              <span className="username">@{this.state.data.username}</span>

              <div>
                <h2>About</h2>
                {this.state.data.bio || <i>Not available.</i>}
              </div>
            </>
          }

          {this.state.data === null &&
            <>
              <img src={DEFAULT_PROFILE_IMAGE} alt="Profile" />

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
            <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 19V5C3 3.89543 3.89543 3 5 3H16.1716C16.702 3 17.2107 3.21071 17.5858 3.58579L20.4142 6.41421C20.7893 6.78929 21 7.29799 21 7.82843V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8.6 9H15.4C15.7314 9 16 8.73137 16 8.4V3.6C16 3.26863 15.7314 3 15.4 3H8.6C8.26863 3 8 3.26863 8 3.6V8.4C8 8.73137 8.26863 9 8.6 9Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 13.6V21H18V13.6C18 13.2686 17.7314 13 17.4 13H6.6C6.26863 13 6 13.2686 6 13.6Z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>

          <img
            src={this.state.displayedImage}
            alt="Profile"
            onClick={() => this.fileInput.current?.click()} />

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