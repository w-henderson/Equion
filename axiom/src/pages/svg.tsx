import React from "react";

export function Loading() {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient x1="8.042%" y1="0%" x2="65.682%" y2="23.865%" id="a">
          <stop stopColor="#fff" stopOpacity="0" offset="0%" />
          <stop stopColor="#fff" stopOpacity=".631" offset="63.146%" />
          <stop stopColor="#fff" offset="100%" />
        </linearGradient>
      </defs>
      <g fill="none" fillRule="evenodd">
        <g transform="translate(1 1)">
          <path d="M36 18c0-9.94-8.06-18-18-18" id="Oval-2" stroke="url(#a)" strokeWidth="2">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 18 18"
              to="360 18 18"
              dur="0.9s"
              repeatCount="indefinite" />
          </path>
          <circle fill="#fff" cx="36" cy="18" r="1">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 18 18"
              to="360 18 18"
              dur="0.9s"
              repeatCount="indefinite" />
          </circle>
        </g>
      </g>
    </svg>
  );
}

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

export function JoinIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 3L15 3M21 3L12 12M21 3V9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H11" stroke="currentColor" strokeLinecap="round" />
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