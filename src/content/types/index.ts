export interface Command {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  execute: (input?: string) => void;
  isAvailable?: () => boolean;
}

export interface CommandMatch {
  command: Command;
  score: number;
  alias?: CommandAlias;
  inputParams?: string;
}

export interface Pipeline {
  organization: string;
  slug: string;
  name: string;
  description: string;
  emoji?: string | undefined;
  reliability?: string | undefined;
  speed?: string | undefined;
}

export interface PipelineSuggestion {
  pipeline: Pipeline;
  score: number;
}

export interface CommandBoxProps {
  onClose?: () => void;
  isVisible?: boolean;
}

export interface CommandAlias {
  id: string;
  name: string;
  commandId: string;
  params?: string;
  description?: string;
}
