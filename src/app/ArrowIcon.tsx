type ArrowDirection = "up-right" | "left" | "right";

const arrowGlyphs: Record<ArrowDirection, string> = {
  "up-right": "\u2197",
  left: "\u2190",
  right: "\u2192",
};

export function ArrowIcon({
  direction = "up-right",
}: {
  direction?: ArrowDirection;
}) {
  return <span aria-hidden="true">{arrowGlyphs[direction]}</span>;
}
