import React from "react";
import "../styles/Modal.scss";

interface ModalProps {
  visible: boolean,
  close: () => void,
  children: React.ReactNode,
  className?: string,
}

/**
 * Component for the modal.
 */
class Modal extends React.Component<ModalProps> {
  /**
   * Render the modal.
   */
  render() {
    return (
      <div className={this.props.visible ? "Modal" : "Modal hidden"} onClick={this.props.close}>
        <div className={this.props.className} onClick={e => e.stopPropagation()}>
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default Modal;