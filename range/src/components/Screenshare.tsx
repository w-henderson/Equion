import React from "react";
import Modal from "./Modal";
import "../styles/Screenshare.scss";

import { MaximiseIcon } from "./Svg";

interface ScreenshareProps {
  stream: MediaStream | null,
  close: () => void
}

/**
 * Component for the screenshare.
 */
class Screenshare extends React.Component<ScreenshareProps> {
  videoRef: React.RefObject<HTMLVideoElement>;

  /**
   * Initializes the component.
   */
  constructor(props: ScreenshareProps) {
    super(props);

    this.videoRef = React.createRef();
  }

  /**
   * Ensures that the video stream is displayed in the modal.
   */
  componentDidUpdate() {
    if (this.videoRef.current && this.videoRef.current.srcObject !== this.props.stream) {
      this.videoRef.current.srcObject = this.props.stream;
    }
  }

  /**
   * Renders the screenshare component.
   */
  render() {
    return (
      <Modal visible={this.props.stream !== null} close={this.props.close} className="Screenshare">
        {this.props.stream &&
          <>
            <video ref={this.videoRef} autoPlay={true} />

            <div className="controls">
              <div onClick={() => this.videoRef.current!.requestFullscreen()}>
                <MaximiseIcon />
              </div>

              <div className="red" onClick={this.props.close}>
                x
              </div>
            </div>
          </>
        }
      </Modal>
    );
  }
}

export default Screenshare;