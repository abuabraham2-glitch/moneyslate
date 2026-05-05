import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, onChange, value, defaultValue, style, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRefs = (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    };

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, []);

    React.useLayoutEffect(() => {
      resize();
    }, [value, defaultValue, resize]);

    React.useEffect(() => {
      // Resize after fonts/layout settle
      const id = requestAnimationFrame(resize);
      return () => cancelAnimationFrame(id);
    }, [resize]);

    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none overflow-hidden",
          className,
        )}
        ref={setRefs}
        value={value}
        defaultValue={defaultValue}
        style={style}
        onChange={(e) => {
          onChange?.(e);
          resize();
        }}
        onInput={resize}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
