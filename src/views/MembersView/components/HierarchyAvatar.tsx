import React from 'react';

interface AvatarProps {
  src?: string | null;
  initials: string;
}

const HierarchyAvatar: React.FC<AvatarProps> = ({ src, initials }) => (
  <div className="relative flex h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
    {src ? (
      <img src={src} alt={initials} className="aspect-square h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center font-semibold text-sm text-muted-foreground tracking-wide">
        {initials}
      </div>
    )}
  </div>
);

export default HierarchyAvatar;
