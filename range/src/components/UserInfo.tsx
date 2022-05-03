import React from 'react';
import '../styles/UserInfo.scss';

import ApiContext from '../api/ApiContext';
import { DEFAULT_PROFILE_IMAGE } from '../api/Api';

import Modal from './Modal';

interface UserInfoProps {
  id: string | null,
  hideCallback: () => void,
}

interface UserInfoState {
  loading: boolean,
  data: UserData | null
}

class UserInfo extends React.Component<UserInfoProps, UserInfoState> {
  context!: React.ContextType<typeof ApiContext>;

  constructor(props: UserInfoProps) {
    super(props);

    this.state = {
      loading: false,
      data: null
    }

    this.close = this.close.bind(this);
  }

  componentDidUpdate() {
    if (!this.state.loading && this.props.id !== null && this.state.data === null) {
      this.setState({ loading: true }, () => {
        this.context.getUserByUid(this.props.id!).then(user => this.setState({ data: user, loading: false }));
      });
    }
  }

  close() {
    if (!this.state.loading) {
      this.props.hideCallback();
      this.setState({ data: null });
    }
  }

  render() {
    return (
      <Modal
        visible={this.props.id !== null}
        close={this.close}
        className="UserInfo">

        {this.state.data !== null &&
          <>
            <img src={this.state.data.image} alt="Profile" />

            <h1>{this.state.data.displayName}</h1>
            <span>@{this.state.data.username}</span>

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
  }
}

UserInfo.contextType = ApiContext;

export default UserInfo;