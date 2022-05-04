import React from 'react';
import '../styles/UserInfo.scss';

import toast from 'react-hot-toast';
import ApiContext from '../api/ApiContext';
import { DEFAULT_PROFILE_IMAGE } from '../api/Api';

import Modal from './Modal';

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
}

class UserInfo extends React.Component<UserInfoProps, UserInfoState> {
  context!: React.ContextType<typeof ApiContext>;

  constructor(props: UserInfoProps) {
    super(props);

    this.state = {
      loading: false,
      editing: false,
      data: null,
      displayName: "",
      about: "",
    }

    this.setEditing = this.setEditing.bind(this);
    this.save = this.save.bind(this);
    this.close = this.close.bind(this);
  }

  componentDidUpdate() {
    if (!this.state.loading && this.props.id !== null && this.state.data === null) {
      this.setState({ loading: true }, () => {
        this.context.getUserByUid(this.props.id!).then(user => this.setState({ data: user, loading: false }));
      });
    }
  }

  setEditing() {
    this.setState({
      editing: true,
      displayName: this.state.data!.displayName,
      about: this.state.data!.bio || "",
    })
  }

  save() {
    toast.promise(
      this.context.updateUser(this.state.displayName, this.state.about).then(() => this.context.getUserByUid(this.props.id!)),
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
      })
  }

  close() {
    if (!this.state.loading) {
      this.props.hideCallback();
      this.setState({
        data: null,
        editing: false,
        displayName: "",
        about: "",
      });
    }
  }

  render() {
    if (!this.state.editing) {
      return (
        <Modal
          visible={this.props.id !== null}
          close={this.close}
          className="UserInfo">

          {this.state.data?.id === this.context.getUid() &&
            <div className="editButton" onClick={this.setEditing}>
              <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.0207 5.82839L15.8491 2.99996L20.7988 7.94971L17.9704 10.7781M13.0207 5.82839L3.41405 15.435C3.22652 15.6225 3.12116 15.8769 3.12116 16.1421V20.6776H7.65669C7.92191 20.6776 8.17626 20.5723 8.3638 20.3847L17.9704 10.7781M13.0207 5.82839L17.9704 10.7781" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          }

          {this.state.data !== null &&
            <>
              <img src={this.state.data.image} alt="Profile" />

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
      )
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
            src={this.state.data!.image}
            alt="Profile"
            onClick={() => toast.error("You cannot yet change your profile picture")} />

          <input
            type="text"
            value={this.state.displayName}
            onChange={e => this.setState({ displayName: e.target.value })} />

          <span className="username" title="You cannot currently change your username">@{this.state.data!.username}</span>

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