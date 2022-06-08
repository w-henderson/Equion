import React from "react";
import "../styles/ContextMenu.scss";

interface ContextMenuProps {
  children?: React.ReactNode[] | React.ReactNode,
}

interface ContextMenuState {
  position: {
    x: number,
    y: number
  } | null
}

/**
 * Component for the context menu.
 */
class ContextMenu extends React.Component<ContextMenuProps, ContextMenuState> {
  ref: React.RefObject<HTMLDivElement>;

  /**
   * Initializes the component.
   */
  constructor(props: ContextMenuProps) {
    super(props);

    this.state = {
      position: null,
    };

    this.ref = React.createRef();

    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
  }

  /**
   * Shows the context menu at the given position.
   */
  show(e: React.MouseEvent<HTMLDivElement>) {
    window.addEventListener("click", this.hide);
    window.addEventListener("contextmenu", this.hide);

    this.setState({
      position: {
        x: e.pageX, y: e.pageY
      }
    });
  }

  /**
   * Hides the context menu if the user clicks outside of it.
   */
  // eslint-disable-next-line
  hide(e: any) {
    if (this.ref.current && e.pageX !== this.state.position?.x && e.pageY !== this.state.position?.y) {
      this.setState({ position: null });
      window.removeEventListener("click", this.hide);
      window.removeEventListener("contextmenu", this.hide);
    }
  }

  /**
   * Cleans up the event listener.
   */
  componentWillUnmount() {
    window.removeEventListener("click", this.hide);
    window.removeEventListener("contextmenu", this.hide);
  }

  /**
   * Renders the context menu.
   */
  render() {
    if (this.state.position !== null) {
      return (
        <div
          className="ContextMenu"
          style={{ top: this.state.position.y, left: this.state.position.x }}
          ref={this.ref}>
          {this.props.children}
        </div>
      );
    } else {
      return <></>;
    }
  }
}

/**
 * Convenience function for handling context menu events.
 */
export function handler(ref: React.RefObject<ContextMenu>): (e: React.MouseEvent<HTMLDivElement>) => void {
  return (e: React.MouseEvent<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.show(e);
    }
  };
}

export default ContextMenu;