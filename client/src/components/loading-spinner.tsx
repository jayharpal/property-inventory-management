import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: number;
  text?: string;
}

/**
 * LoadingSpinner component to show loading state
 * 
 * @param size The size of the spinner in rem units (default: 6)
 * @param text The text to display below the spinner (default: "Loading...")
 */
export function LoadingSpinner({ size = 6, text = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className={`h-${size} w-${size} animate-spin text-primary mb-4`} />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}