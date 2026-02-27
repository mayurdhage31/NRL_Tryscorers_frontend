export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  history: ChatMessage[];
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (history: ChatMessage[]) => void;
  onError: (error: string) => void;
}
