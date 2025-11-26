"use client";

import { cn } from "@/shared/utils/cn";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

// Кастомный компонент для ссылок, открывающихся в новой вкладке
const LinkComponent = (props: any) => (
  <a 
    {...props} 
    target="_blank" 
    rel="noopener noreferrer"
  />
);

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      components={{
        a: LinkComponent
      }}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
