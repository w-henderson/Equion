import React from 'react';
import '../styles/AuthDialog.scss';
import logo from "../images/logo.png";

import toast from 'react-hot-toast';

import ApiContext from '../api/ApiContext';

interface AuthDialogProps {
  authComplete: () => void
}

interface AuthDialogState {
  tab: "login" | "signup",
  username: string,
  password: string,
  confirmPassword: string,
  displayName: string,
  email: string,
}

class AuthDialog extends React.Component<AuthDialogProps, AuthDialogState> {
  context!: React.ContextType<typeof ApiContext>;

  constructor(props: AuthDialogProps) {
    super(props);

    this.state = {
      tab: "login",
      username: "",
      password: "",
      confirmPassword: "",
      displayName: "",
      email: "",
    }

    this.login = this.login.bind(this);
    this.signup = this.signup.bind(this);
  }

  login(e: React.FormEvent) {
    e.preventDefault();

    toast.promise(this.context.login(this.state.username, this.state.password), {
      loading: "Logging in...",
      success: "Logged in!",
      error: (e) => `${e}`,
    }).then(() => {
      this.props.authComplete();
    }, () => {
      this.setState({
        password: "",
        confirmPassword: "",
      })
    });
  }

  signup(e: React.FormEvent) {
    e.preventDefault();

    if (this.state.password !== this.state.confirmPassword) {
      this.context.errorHandler("Passwords do not match");
      this.setState({
        password: "",
        confirmPassword: "",
      })
      return;
    }

    toast.promise(this.context.signup(this.state.username, this.state.password, this.state.displayName, this.state.email), {
      loading: "Signing up...",
      success: "Signed up, welcome to Equion!",
      error: (e) => `${e}`,
    }).then(() => {
      this.props.authComplete();
    }, () => {
      this.setState({
        password: "",
        confirmPassword: "",
      })
    });
  }

  render() {
    if (this.state.tab === "login") {
      return (
        <div className="AuthDialog" data-tauri-drag-region>
          <img src={logo} />

          <h1>Welcome to Equion</h1>

          <form onSubmit={this.login}>
            <input
              type="text"
              placeholder="Username"
              key="username"
              value={this.state.username}
              autoComplete={"off"}
              onChange={(e) => this.setState({ username: e.target.value })} />

            <input
              type="password"
              placeholder="Password"
              key="password"
              value={this.state.password}
              autoComplete={"off"}
              onChange={(e) => this.setState({ password: e.target.value })} />

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

          <form onSubmit={this.signup}>
            <input
              type="text"
              placeholder="Username"
              key="username"
              value={this.state.username}
              autoComplete={"off"}
              onChange={(e) => this.setState({ username: e.target.value })} />

            <input
              type="password"
              placeholder="Password"
              key="password"
              value={this.state.password}
              autoComplete={"off"}
              onChange={(e) => this.setState({ password: e.target.value })} />

            <input
              type="password"
              placeholder="Confirm Password"
              key="confirm_password"
              value={this.state.confirmPassword}
              autoComplete={"off"}
              onChange={(e) => this.setState({ confirmPassword: e.target.value })} />

            <input
              type="email"
              placeholder="Email"
              key="email"
              value={this.state.email}
              autoComplete={"off"}
              onChange={(e) => this.setState({ email: e.target.value })} />

            <input
              type="text"
              placeholder="Display Name"
              key="display_name"
              value={this.state.displayName}
              autoComplete={"off"}
              onChange={(e) => this.setState({ displayName: e.target.value })} />

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

AuthDialog.contextType = ApiContext;

export default AuthDialog;