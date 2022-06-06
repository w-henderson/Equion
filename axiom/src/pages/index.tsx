import React from "react";
import Helmet from "react-helmet";
import "../styles/index.scss";

import icon from "../images/icon.png";
import screenshot from "../images/screenshot.png";

import { DownloadIcon, LaTeXIcon, VoiceIcon, SpeedIcon } from "./svg";

class Index extends React.Component {
  render() {
    return (
      <main>
        <Helmet>
          <title>Equion | Integrate Together</title>
          <meta name="description" content="Equion, an intuitive chat platform for work and play. With built-in support for LaTeX, high-quality voice and video chat with up to 50% lower latency than Discord, and a stylish and snappy interface, Equion is the perfect platform for any group." />
          <link rel="icon" href={icon} />
        </Helmet>

        <nav>
          <div>
            <img src={icon} alt="Equion" />
            <h2>Equion</h2>
          </div>

          <ul>
            <li><a href="#">Features</a></li>
            <li><a href="#">Download</a></li>
          </ul>
        </nav>

        <section className="hero">
          <div className="title">
            <img src={icon} alt="Equion" />
            <h1>Equion</h1>
          </div>

          <span>Integrate Together.</span>

          <div className="bigButtons">
            <a href="#">
              <DownloadIcon />
              <span>Download for Windows</span>
            </a>

            <a href="#" className="disabled">
              <DownloadIcon />
              <span>Other Platforms Coming Soon</span>
            </a>
          </div>

          <img src={screenshot} alt="Equion screenshot" />
        </section>

        <section>
          <div className="title">
            <h2>Features</h2>
            <span>An intuitive chat platform for work and play.</span>
          </div>

          <span>
            With built-in support for LaTeX, high-quality voice and video chat with up to 50% lower latency than Discord<sup>1</sup>, and a stylish and snappy interface, Equion is the perfect platform for any group.
          </span>

          <div className="features">
            <div>
              <div>
                <LaTeXIcon />
              </div>

              <h3>Native support for LaTeX and Markdown.</h3>
              <span>The days of incomprehensible equations in ASCII are over. Equion makes it easy to share complex ideas in an easy-to-read format.</span>
            </div>

            <div>
              <div>
                <VoiceIcon />
              </div>

              <h3>High-quality, low-latency voice chat and screen sharing.</h3>
              <span>Peer-to-peer technology allows for lower latency and better privacy for those problems you can't solve over text.</span>
            </div>

            <div>
              <div>
                <SpeedIcon />
              </div>

              <h3>Lightweight and lightning-fast.</h3>
              <span>With the entire app fitting within Discord's 8 MB attachment size limit, and using just 3% of the RAM that Discord uses<sup>2</sup>, Equion won't slow you down.</span>
            </div>
          </div>
        </section>

        <section>
          <div className="title">
            <h2>Download</h2>
            <span>Start integrating today for free.</span>
          </div>

          <div className="bigButtons">
            <a href="#">
              <DownloadIcon />
              <span>Download for Windows</span>
            </a>
          </div>
        </section>

        <footer>
          <div className="citations">
            <p>
              <sup>1</sup>: Based on two clients geographically close together to maximise the benefits of peer-to-peer networking.
            </p>

            <p>
              <sup>2</sup>: Calculated on the latest versions of Equion and Discord idle and minimised, Equion used 4 MB maximum RAM while Discord used 140 MB maximum RAM.
            </p>
          </div>

          <hr />

          <div className="bottom">
            <img src={icon} alt="Equion" />
            <h2>Equion</h2>
            <span>&copy; William Henderson 2022</span>
          </div>
        </footer>
      </main>
    )
  }
}

export default Index;