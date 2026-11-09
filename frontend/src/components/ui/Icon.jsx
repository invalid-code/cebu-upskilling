/** Shared stroke width for every lucide-react icon (design: one weight, 1.75). */
export const ICON_STROKE_WIDTH = 1.75;

/**
 * Renders a lucide-react icon with the shared stroke width.
 * Usage: <Icon as={Bell} size={16} aria-hidden="true" />
 * A global `.lucide` rule in index.css applies the same width to icons used directly.
 */
export default function Icon({ as: Component, size = 16, strokeWidth = ICON_STROKE_WIDTH, ...rest }) {
  if (!Component) return null;
  return <Component size={size} strokeWidth={strokeWidth} {...rest} />;
}
