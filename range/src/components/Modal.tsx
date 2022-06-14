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
class Modal extends React.Component<ModalProps, { phase: "hidden" | "waiting" | "visible" }> {
  animationTimeout: number | null = null;

  /**
   * Initializes the component.
   */
  constructor(props: ModalProps) {
    super(props);

    this.state = { phase: "hidden" };
  }

  /**
   * Handle CSS transitions for showing and hiding the modal.
   */
  componentDidUpdate(prevProps: ModalProps) {
    if (this.animationTimeout) {
      window.clearTimeout(this.animationTimeout);
      this.animationTimeout = null;
    }

    if (prevProps.visible && !this.props.visible) {
      this.animationTimeout = window.setTimeout(() => this.setState({ phase: "hidden" }), 250);
    } else if (!prevProps.visible && this.props.visible) {
      this.setState({ phase: "waiting" }, () => {
        this.animationTimeout = window.setTimeout(() => this.setState({ phase: "visible" }), 10);
      });
    }
  }

  /**
   * Render the modal.
   */
  render() {
    if (this.state.phase === "hidden") return <></>;

    return (
      <div className={(this.props.visible && this.state.phase === "visible") ? "Modal" : "Modal hidden"} onClick={this.props.close}>
        <div className={this.props.className} onClick={e => e.stopPropagation()}>
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default Modal;