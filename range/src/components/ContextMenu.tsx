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
  timeout: number | null = null;

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
    console.log("show");

    this.timeout = window.setTimeout(() => {
      window.addEventListener("click", this.hide);
      window.addEventListener("contextmenu", this.hide);
    }, 100);

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
    if (this.ref.current) {
      console.log("hide");
      this.setState({ position: null });

      if (this.timeout !== null) {
        window.clearTimeout(this.timeout);
        this.timeout = null;
      }

      window.removeEventListener("click", this.hide);
      window.removeEventListener("contextmenu", this.hide);
    }
  }

  /**
   * Ensures that the whole context menu is always on the screen.
   */
  componentDidUpdate() {
    if (this.state.position) {
      const rect = this.ref.current!.getBoundingClientRect();
      let { x, y } = this.state.position;

      if (rect.bottom > window.innerHeight) y = window.innerHeight - rect.height;
      if (rect.right > window.innerWidth) x = window.innerWidth - rect.width;

      if (x !== this.state.position.x || y !== this.state.position.y) {
        this.setState({ position: { x, y } });
      }
    }
  }

  /**
   * Cleans up the event listener.
   */
  componentWillUnmount() {
    if (this.timeout !== null) {
      window.clearTimeout(this.timeout);
      this.timeout = null;
    }

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
      e.preventDefault();
    }
  };
}

export default ContextMenu;