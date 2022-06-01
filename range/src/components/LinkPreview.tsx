import React from "react";
import "../styles/LinkPreview.scss";

import { LinkPreviewProvider, PROVIDERS } from "../api/LinkPreviewRegex";

interface LinkPreviewProps {
  link: string
}

interface LinkPreviewState {
  preview: {
    provider: LinkPreviewProvider,
    id: string
  } | null | undefined
}

/**
 * Component for a link preview.
 */
class LinkPreview extends React.Component<LinkPreviewProps, LinkPreviewState> {
  /**
   * Initializes the component.
   */
  constructor(props: LinkPreviewProps) {
    super(props); const link = this.props.link;

    for (const provider of PROVIDERS) {
      if (provider.regex.test(link)) {
        this.state = {
          preview: {
            provider,
            id: link.split(provider.regex)[1],
          }
        };
        return;
      }
    }

    this.state = {
      preview: undefined
    };
  }

  /**
   * Renders the component.
   */
  render() {
    if (!this.state.preview) {
      return <></>;
    } else if (this.state.preview.provider.type === "image") {
      return null;
    } else if (this.state.preview.provider.type === "iframe") {
      return (
        <div className="LinkPreview">
          <iframe
            src={this.state.preview.provider.url.replace("{{id}}", this.state.preview.id).replace("{{url}}", this.props.link)}
            width={this.state.preview.provider.width}
            height={this.state.preview.provider.height}
            frameBorder={0}
            allowFullScreen={true} />
        </div>
      );
    }
  }
}

export default LinkPreview;