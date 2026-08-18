import type { CategoryId } from '../data/categories';
import { ICON_SVG } from './index';

export function CategoryIcon({
  category,
  size = 24,
  className,
}: {
  category: CategoryId;
  size?: number;
  className?: string;
}) {
  const html = ICON_SVG[category].replace('width="24" height="24"', `width="${size}" height="${size}"`);
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
