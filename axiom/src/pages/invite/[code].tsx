import React from "react";
import { Helmet } from "react-helmet";
import "../../styles/index.scss";

import icon from "../../images/icon.png";
import { DownloadIcon, JoinIcon, Loading } from "../svg";

const INVITE_API_ENDPOINT = "https://localhost/api/v1/invite";

type InvitePageProps = {
  code: string;
}

type InvitePageState = {
  phase: "loading" | "success" | "invalid" | "error";
  setName: string | null;
  setIcon: string | null;
}

class InvitePage extends React.Component<InvitePageProps, InvitePageState> {
  constructor(props: InvitePageProps) {
    super(props);

    this.state = {
      phase: "loading",
      setName: null,
      setIcon: null,
    };
  }

  componentDidMount() {
    fetch(INVITE_API_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ code: this.props.code })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          this.setState({
            phase: "success",
            setName: res.invite.setName,
            setIcon: res.invite.setIcon
          });
        } else {
          this.setState({ phase: "invalid" });
        }
      });
  }

  render() {
    let title = this.state.setName;
    if (this.state.phase === "loading") title = "Loading...";
    if (this.state.phase === "invalid") title = "Invalid Invite";
    if (this.state.phase === "error") title = "Error";

    return (
      <main>
        <Helmet>
          <title>{`${title} | Equion`}</title>
          <link rel="icon" href={icon} />
        </Helmet>

        <nav>
          <div>
            <img src={icon} alt="Equion" />
            <h2>Equion</h2>
          </div>

          <ul>
            <li><a href="/#features">Features</a></li>
            <li><a href="/#download">Download</a></li>
          </ul>
        </nav>

        <section>
          <div className="invite">
            {this.state.phase === "loading" && <Loading />}

            {this.state.phase === "success" &&
              <>
                <div className="icon">
                  <span>{this.state.setIcon}</span>
                </div>

                <h2>You've been invited to</h2>
                <h1>{this.state.setName}</h1>

                <div className="bigButtons">
                  <a href={`equion://invite/${this.props.code}`}>
                    <JoinIcon />
                    <span>Open in Equion</span>
                  </a>

                  <a href="/download/windows">
                    <DownloadIcon />
                    <span>Download Equion</span>
                  </a>
                </div>
              </>
            }

            {this.state.phase === "invalid" &&
              <>
                <h1 className="smaller">The invite is invalid or has expired!</h1>
              </>
            }

            {this.state.phase === "error" &&
              <>
                <h1>An error occurred!</h1>
              </>
            }
          </div>
        </section>
      </main>
    )
  }
}

export default InvitePage;