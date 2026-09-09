import { Link, useLocation } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';

// Same as <Link>, but stamps the current location as `backgroundLocation` in
// router state — the panel routes in App.tsx use this to render the target
// record as a slide-over on top of the page you're already on, instead of a
// full navigation. Falls through to a normal full-page render if opened
// directly (no backgroundLocation in state, e.g. a pasted URL or a refresh).
export function RecordLink(props: LinkProps) {
  const location = useLocation();
  return <Link {...props} state={{ ...props.state, backgroundLocation: location }} />;
}
