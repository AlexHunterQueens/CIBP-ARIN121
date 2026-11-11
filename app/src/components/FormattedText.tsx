import React from 'react';

export interface FormattedTextProps {
  text?: string | null;
  className?: string;
  as?: 'span' | 'div' | 'p';
}

/**
 * Strips all asterisk characters (*) from a string.
 */
export function cleanAiAsterisks(str: string): string {
  if (!str) return '';
  return str.replace(/\*/g, '');
}

/**
 * Renders text with **bold** converted to <strong> tags,
 * and strips any raw leftover asterisks (* or **) so no raw asterisks appear.
 * Preserves newlines when present.
 */
export function renderFormattedAiText(text?: string | null): React.ReactNode {
  if (!text) return null;

  // Split by newline so line breaks are preserved cleanly
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    // Split line by **bold** markdown tags
    const parts = line.split(/\*\*([\s\S]*?)\*\*/g);

    return (
      <React.Fragment key={lineIdx}>
        {lineIdx > 0 && <br />}
        {parts.map((part, partIdx) => {
          // Odd indexes correspond to matched text inside **...**
          const isBold = partIdx % 2 === 1;
          // Strip any raw leftover asterisks from both bold and normal segments
          const cleaned = part.replace(/\*/g, '');
          if (!cleaned) return null;

          if (isBold) {
            return (
              <strong key={partIdx} className="font-bold">
                {cleaned}
              </strong>
            );
          }
          return <React.Fragment key={partIdx}>{cleaned}</React.Fragment>;
        })}
      </React.Fragment>
    );
  });
}

export const FormattedText: React.FC<FormattedTextProps> = ({
  text,
  className,
  as: Component = 'span',
}) => {
  if (!text) return null;

  return (
    <Component className={className}>
      {renderFormattedAiText(text)}
    </Component>
  );
};
