"use client";

import { cn } from "@/shared/utils/cn";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "break-words overflow-wrap-anywhere max-w-full",
        "[&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:max-w-full",
        "[&_code]:whitespace-pre-wrap [&_code]:break-words",
        "[&_p]:break-words [&_p]:max-w-full",
        "[&_div]:break-words [&_div]:max-w-full",
        "[&_span]:break-words [&_span]:max-w-full",
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
