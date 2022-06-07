use humphrey_json::prelude::*;

pub struct GitHubRelease {
    pub tag_name: String,
    pub published_at: String,
    pub assets: Vec<GitHubAsset>,
}

pub struct GitHubAsset {
    pub url: String,
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
