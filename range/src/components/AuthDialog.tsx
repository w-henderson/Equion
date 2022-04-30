import React from 'react';
import '../styles/AuthDialog.scss';

import logo from "../images/logo.png";

interface AuthDialogState {
  tab: "login" | "signup"
}

class AuthDialog extends React.Component<{}, AuthDialogState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      tab: "login"
    }
  }

  render() {
    if (this.state.tab === "login") {
      return (
        <div className="AuthDialog" data-tauri-drag-region>
          <img src={logo} />

          <h1>Welcome to Equion</h1>

          <form>
            <input type="text" placeholder="Username" key="username" />
            <input type="password" placeholder="Password" key="password" />
            <input type="submit" value="Login" key="login" />
          </form>

          <span onClick={() => this.setState({ tab: "signup" })}>
            Create a new account
          </span>
        </div>
      )
    } else {
      return (
        <div className="AuthDialog" data-tauri-drag-region>
          <img src={logo} />

          <h1>Welcome to Equion</h1>

          <form>
            <input type="text" placeholder="Username" key="username" />
            <input type="password" placeholder="Password" key="password" />
            <input type="text" placeholder="Email" key="email" />
            <input type="text" placeholder="Display Name" key="display_name" />
            <input type="submit" value="Sign Up" key="sign_up" />
          </form>

          <span onClick={() => this.setState({ tab: "login" })}>
            Sign in to an existing account
          </span>
        </div>
      )
    }
  }
}

export default AuthDialog;