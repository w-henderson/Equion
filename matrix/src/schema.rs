//! Data structures for parsing the GitHub API responses.

use humphrey_json::prelude::*;

/// Represents a release on GitHub.
pub struct GitHubRelease {
    /// The tag of the release, e.g. `v1.0.0`.
    pub tag_name: String,
    /// When the release was published.
    pub published_at: String,
    /// The assets associated with the release.
    pub assets: Vec<GitHubAsset>,
}

/// Represents an asset on GitHub.
pub struct GitHubAsset {
    /// The API URL of the asset.
    pub url: String,
    /// The filename of the asset.
    pub name: String,
}

json_map! {
    GitHubRelease,
    tag_name => "tag_name",
    published_at => "published_at",
    assets => "assets"
}

json_map! {
    GitHubAsset,
    url => "url",
    name => "name"
}
