import type { CSSProperties } from "react";
import type { TextStyle } from "@/lib/site-config";

// Used by both the public page and the live preview. Mobile values are
// optional, preserving the existing layout until explicitly edited.
export function responsiveTextStyle(style: TextStyle): CSSProperties {
  return {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    transform: `translate(${style.x}px, ${style.y}px)`,
    textAlign: style.align,
    ...(style.color ? { color: style.color } : {}),
    ...(style.mobile ? {
      "--editor-mobile-font-size": `${style.mobile.fontSize}px`,
      "--editor-mobile-font-family": style.mobile.fontFamily || style.fontFamily,
      "--editor-mobile-x": `${style.mobile.x}px`,
      "--editor-mobile-y": `${style.mobile.y}px`,
      "--editor-mobile-align": style.mobile.align,
      "--editor-mobile-color": style.mobile.color || style.color || "#ffffff",
    } : {}),
  } as CSSProperties;
}
