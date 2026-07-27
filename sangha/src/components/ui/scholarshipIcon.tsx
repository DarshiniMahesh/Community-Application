import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";


const scholarshipIconVariants = cva(
  "inline-flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        success: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
      },
      size: {
        sm: "h-6 w-6",
        md: "h-8 w-8",
        lg: "h-10 w-10",
        xl: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ScholarshipIconProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof scholarshipIconVariants> {
  /** Optional aria-label for accessibility */
  label?: string;
}

function ScholarshipIcon({
  className,
  variant,
  size,
  label = "Scholarships",
  ...props
}: ScholarshipIconProps) {
  const sizeMap = {
    sm: 14,
    md: 18,
    lg: 22,
    xl: 26,
  };

  const svgSize = sizeMap[size ?? "md"];

  return (
    <div
      className={cn(scholarshipIconVariants({ variant, size }), className)}
      role="img"
      aria-label={label}
      {...props}
    >
      {/* Graduation cap / scholarship SVG icon */}
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Mortarboard base (diploma cap) */}
        <path
          d="M12 3L2 8.5L12 14L22 8.5L12 3Z"
          fill="currentColor"
          opacity="0.9"
        />
        {/* Cap brim highlight */}
        <path
          d="M12 3L2 8.5L12 14L22 8.5L12 3Z"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinejoin="round"
          opacity="0.4"
          fill="none"
        />
        {/* Left side of the cap body */}
        <path
          d="M6 11.2V16.5C6 16.5 8.5 19 12 19C15.5 19 18 16.5 18 16.5V11.2L12 14.3L6 11.2Z"
          fill="currentColor"
          opacity="0.7"
        />
        {/* Tassel string */}
        <line
          x1="20"
          y1="8.5"
          x2="20"
          y2="15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Tassel end */}
        <circle cx="20" cy="16" r="1.2" fill="currentColor" />
      </svg>
    </div>
  );
}

export { ScholarshipIcon, scholarshipIconVariants };