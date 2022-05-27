import React from "react";
import toast from "react-hot-toast";
import ApiContext from "../api/ApiContext";

interface SetManagerProps {
  createSet: (name: string, icon: string) => void,
  joinSet: (id: string) => void
}

interface SetManagerState {
  tab: "join" | "create",
  setId: string,
  setName: string,
  icon: string,
  loading: boolean
}

const ICONS = [
  "α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ",
  "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω"
];

/**
 * Component for the set manager.
 * 
 * This handles the creation and joining of sets.
 */
class SetManager extends React.Component<SetManagerProps, SetManagerState> {
  context!: React.ContextType<typeof ApiContext>;

  /**
   * Initialise the set manager.
   */
  constructor(props: SetManagerProps) {
    super(props);

    this.state = {
      tab: "join",
      setId: "",
      setName: "",
      icon: "Icon",
      loading: false
    };

    this.clear = this.clear.bind(this);
    this.changeName = this.changeName.bind(this);
    this.changeIcon = this.changeIcon.bind(this);
    this.createSet = this.createSet.bind(this);
    this.joinSet = this.joinSet.bind(this);
  }

  /**
   * Clear the join/create dialog data.
   */
  clear() {
    this.setState({
      tab: "join",
      setId: "",
      setName: "",
      icon: "Icon",
      loading: false
    });
  }

  /**
   * Create a new set with the name and icon from the state.
   */
  createSet(e: React.FormEvent) {
    e.preventDefault();

    if (this.state.setName.length === 0) return;

    if (!ICONS.includes(this.state.icon)) {
      toast.error("Invalid icon");
      return;
    }

    this.setState({
      loading: true
    });

    this.props.createSet(this.state.setName, this.state.icon);
  }

  /**
   * Join a set with the ID from the state.
   */
  joinSet(e: React.FormEvent) {
    e.preventDefault();

    if (this.state.setId.length === 0) return;

    this.setState({
      loading: true
    });

    this.props.joinSet(this.state.setId);
  }

  /**
   * Change the name of the set.
   * 
   * This also changes the icon to match.
   */
  changeName(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value.length > 0) {
      this.setState({
        setName: e.target.value,
        icon: this.context.getGreekLetter(e.target.value[0].toLowerCase())
      });
    } else {
      this.setState({
        setName: "",
        icon: "α"
      });
    }
  }

  /**
   * Change the icon of the set.
   * 
   * This scrolls through the available icons, which are Greek letters because maths.
   */
  changeIcon(direction: number) {
    const currentIndex = ICONS.indexOf(this.state.icon);
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = ICONS.length - 1;
    if (newIndex >= ICONS.length) newIndex = 0;

    this.setState({
      icon: ICONS[newIndex]
    });
  }

  /**
   * Render the set manager.
   */
  render() {
    if (this.state.tab === "create") {
      return (
        <>
          <h1>Create a Set</h1>

          <form onSubmit={this.createSet}>
            <input
              type="text"
              placeholder="Set Name"
              key="set_name"
              value={this.state.setName}
              autoComplete={"off"}
              onChange={this.changeName} />

            <div className="input">
              <div onClick={() => this.changeIcon(-1)}>&lt;</div>

              <input
                type="text"
                key="icon"
                value={this.state.icon}
                className={this.state.icon === "Icon" ? "placeholder" : undefined}
                readOnly={true} />

              <div onClick={() => this.changeIcon(1)}>&gt;</div>
            </div>

            <input
              type="submit"
              value={this.state.loading ? "Loading..." : "Create Set"}
              key="create_set"
              disabled={this.state.loading} />
          </form>

          <span onClick={() => { if (!this.state.loading) this.setState({ tab: "join" }); }}>
            Join an existing set
          </span>
        </>
      );
    } else {
      return (
        <>
          <h1>Join a Set</h1>

          <form onSubmit={this.joinSet}>
            <input
              type="text"
              placeholder="Set ID"
              key="set_id"
              value={this.state.setId}
              autoComplete={"off"}
              onChange={e => this.setState({ setId: e.target.value })} />

            <input
              type="submit"
              value={this.state.loading ? "Loading..." : "Join Set"}
              key="join_set"
              disabled={this.state.loading} />
          </form>

          <span onClick={() => { if (!this.state.loading) this.setState({ tab: "create" }); }}>
            Create a new set
          </span>
        </>
      );
    }
  }
}

SetManager.contextType = ApiContext;

export default SetManager;