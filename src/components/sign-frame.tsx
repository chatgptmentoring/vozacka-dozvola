import { asset, cn } from "@/lib/utils";

type SignFrameProps = {
  src: string;
  alt: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "size-20",
  md: "size-32 sm:size-36",
  lg: "size-44 sm:size-52",
};

export function SignFrame({ src, alt, className, size = "md" }: SignFrameProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]",
        sizes[size],
        className,
      )}
    >
      <img
        src={asset(src)}
        alt={alt}
        className="h-[86%] w-[86%] object-contain"
      />
    </div>
  );
}
