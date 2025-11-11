export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  execute: (params: any) => Promise<any>;
  requiresPersonalInfo?: boolean;
}

export interface ToolRegistry {
  [key: string]: Tool;
}

