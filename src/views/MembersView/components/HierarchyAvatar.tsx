import React from 'react';

interface AvatarProps {
  src?: string | null;
  initials: string;
}

const HierarchyAvatar: React.FC<AvatarProps> = ({ src, initials }) => (
  <div className="relative flex h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted">
    {src ? (
      <img src={src} alt={initials} className="aspect-square h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center font-medium text-muted-foreground">
        {initials}
      </div>
    )}
  </div>
);

export default HierarchyAvatar;
