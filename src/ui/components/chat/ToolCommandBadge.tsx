import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/components/ui/tooltip';

interface ToolCommandBadgeProps {
  icon: string;
  name: string;
  description?: string;
}

export default function ToolCommandBadge({ icon, name, description }: ToolCommandBadgeProps) {
  const badge = (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-sm font-medium whitespace-nowrap">
      <span>{icon}</span>
      <span>{name}</span>
    </span>
  );

  if (description) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs max-w-xs">{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}



