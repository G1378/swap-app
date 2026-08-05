import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt: string;
  fallback: string;
  size?: number;
}

/**
 * Simple avatar with an image fallback to the subject's initials.
 */
const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = 40, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground",
          className
        )}
        style={{ width: size, height: size }}
        {...props}
      >
        {src ? (
          <Image src={src} alt={alt} fill sizes={`${size}px`} className="object-cover" />
        ) : (
          <span className="text-sm font-semibold uppercase">{fallback.slice(0, 2)}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
