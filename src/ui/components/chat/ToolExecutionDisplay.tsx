"use client";

import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { ToolExecution } from "@shared/types/tools";

interface ToolExecutionDisplayProps {
  toolExecution: ToolExecution;
  className?: string;
}

export default function ToolExecutionDisplay({ toolExecution, className }: ToolExecutionDisplayProps) {
  if (!toolExecution) {
    return null;
  }

  return (
    <div className={className}>
      <Tool>
        <ToolHeader 
          state={toolExecution.state} 
          type={`tool-${toolExecution.toolName}`} 
          title={toolExecution.toolName}
        />
        <ToolContent>
          {toolExecution.input && <ToolInput input={toolExecution.input} />}
          {(toolExecution.output || toolExecution.error) && (
            <ToolOutput 
              output={toolExecution.output} 
              errorText={toolExecution.error}
            />
          )}
        </ToolContent>
      </Tool>
    </div>
  );
}

