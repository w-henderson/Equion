import React from "react";
import logo from "../../images/logo.png";
import toast from "react-hot-toast";
import "../../styles/user/AuthDialog.scss";

import RegionSelector from "./RegionSelector";
import ApiContext from "../../api/ApiContext";

interface AuthDialogProps {
  region: RegionData,
  setRegion: (region: number) => void,
  authComplete: () => void,
}

interface AuthDialogState {
  tab: "login" | "signup",
  username: string,
  password: string,
  confirmPassword: string,
  displayName: string,
  email: string,
  loading: boolean,
  regionSelectorVisible: boolean
}

/**
 * Component for the authentication dialog.
 * 
 * Handles authentication, calling the `authComplete` callback when complete.
 */
class AuthDialog extends React.Component<AuthDialogProps, AuthDialogState> {
  context!: React.ContextType<typeof ApiContext>;

  /**
   * Initializes the component.
   */
  constructor(props: AuthDialogProps) {
    super(props);

    this.state = {
      tab: "login",
      username: "",
      password: "",
      confirmPassword: "",
      displayName: "",
      email: "",
      loading: false,
      regionSelectorVisible: false
    };

    this.login = this.login.bind(this);
    this.signup = this.signup.bind(this);
  }

  /**
   * Attempts to log in the user with the credentials in the state.
   * 
   * Called when the user clicks the login button.
   */
  login(e: React.FormEvent) {
    e.preventDefault();

    this.setState({ loading: true });

    toast.promise(this.context!.client.login(this.state.username, this.state.password), {
      loading: "Logging in...",
      success: "Logged in!",
      error: (e) => `${e}`,
    }).then(() => {
      this.props.authComplete();
    }, () => {
      this.setState({
        password: "",
        confirmPassword: "",
        loading: false
      });
    });
  }

  /**
   * Attempts to sign up the user with the credentials in the state.
   * 
   * Called when the user clicks the signup button.
   */
  signup(e: React.FormEvent) {
    e.preventDefault();

    if (this.state.password !== this.state.confirmPassword) {
      this.context!.errorHandler("Passwords do not match");
      this.setState({
        password: "",
        confirmPassword: "",
      });
      return;
    }

    this.setState({ loading: true });

    toast.promise(this.context!.client.signup(this.state.username, this.state.password, this.state.displayName, this.state.email), {
      loading: "Signing up...",
      success: "Signed up, welcome to Equion!",
      error: (e) => `${e}`,
    }).then(() => {
      this.props.authComplete();
    }, () => {
      this.setState({
        password: "",
        confirmPassword: "",
        loading: false
      });
    });
  }

  /**
   * Renders the component.
   */
  render() {
    let inner = <></>;

    if (this.state.tab === "login") {
      inner = (
        <>
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

            <input type="submit" value={this.state.loading ? "Loading..." : "Login"} key="login" disabled={this.state.loading} />
          </form>

          <span onClick={() => { if (!this.state.loading) this.setState({ tab: "signup" }); }}>
            Create a new account
          </span>
        </>
      );
    } else {
      inner = (
        <>
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

            <input type="submit" value={this.state.loading ? "Loading..." : "Sign Up"} key="sign_up" disabled={this.state.loading} />
          </form>

          <span onClick={() => { if (!this.state.loading) this.setState({ tab: "login" }); }}>
            Sign in to an existing account
          </span>
        </>
      );
    }

    return (
      <div className="AuthDialog" data-tauri-drag-region>
        <img src={logo} alt="Equion logo" />

        <h1>Welcome to Equion</h1>

        {inner}

        <RegionSelector
          region={this.props.region}
          setRegion={this.props.setRegion} />
      </div>
    );
  }
}

AuthDialog.contextType = ApiContext;

export default AuthDialog;