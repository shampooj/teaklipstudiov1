// iPadOS masquerades as macOS in the user agent, hence the touch-points check.
export const isMobileDevice = () =>
  /Android|iPhone|iPod|iPad/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
