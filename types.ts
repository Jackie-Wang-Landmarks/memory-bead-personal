
export interface BeadEcho {
  id: string;
  date: string;
  text: string;
  images?: string[];
  audioUrl?: string;
}

export interface BeadData {
  id: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  title: string;
  prompt: string;
  userStory?: string;
  date: string;
  dominantColor: string;
  shape: string; // CSS border-radius value
  type: 'daily' | 'scanned';
  isDraft?: boolean;
  echoQuestions?: string[]; // Array of reflective questions for the Echo tab
  
  // Media extensions
  audioUrl?: string;
  additionalImages?: string[];
  
  // Blog history
  echoes?: BeadEcho[];
}

export type Tab = 'collection' | 'echo' | 'create';

export interface ImageAnalysisResult {
  title: string;
  prompt: string;
  color: string;
}
