import React from "react";

export function DownloadIcon() {
  return (
    <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 20L18 20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 4V16M12 16L15.5 12.5M12 16L8.5 12.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LaTeXIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4L12 4L20 4V7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20H12H20V17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20L12 12L4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VoiceIcon() {
  return (
    <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4L12 20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 9L8 15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 10L20 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 10L4 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 7L16 17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SpeedIcon() {
  return (
    <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 7.01L12.01 6.99889" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 9.01L16.01 8.99889" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 9.01L8.01 8.99889" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 13.01L18.01 12.9989" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 13.01L6.01 12.9989" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 17.01L17.01 16.9989" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 17.01L7.01 16.9989" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 17L13 11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 20.001H4C2.74418 18.3295 2 16.2516 2 14C2 8.47715 6.47715 4 12 4C17.5228 4 22 8.47715 22 14C22 16.2516 21.2558 18.3295 20 20.001L15.5 20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 23C13.6569 23 15 21.6569 15 20C15 18.3431 13.6569 17 12 17C10.3431 17 9 18.3431 9 20C9 21.6569 10.3431 23 12 23Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SvgIcon(props: { name: string }) {
  switch (props.name) {
    case "download":
      return <DownloadIcon />;
    case "latex":
      return <LaTeXIcon />;
    case "voice":
      return <VoiceIcon />;
    case "speed":
      return <SpeedIcon />;
    default:
      return null;
  }
}