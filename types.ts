export enum StyleOption {
  STYLE_ONLY = "Style only",
  OUTFIT_POSE = "Outfit + pose",
  BACKGROUND_ONLY = "Background only",
  COLOR_PALETTE = "Color palette / grading",
  RENDERING_STYLE = "Rendering style",
  COMPLETE_RECREATION = "Complete recreation",
}

export interface ReferenceStyle {
  identified_style: string;
  color_palette: string;
  background_elements: string;
}

export interface StyleMirrorResponse {
  status: "success" | "error";
  message?: string;
  reference_style?: ReferenceStyle;
  final_prompt?: string;
}

export interface StyleAnalysisResponse {
  status: "success" | "error";
  message?: string;
  identified_style_summary?: string;
  recommended_options?: StyleOption[];
}

export type AppStatus = 'idle' | 'analyzing' | 'generating' | 'success' | 'error';

export type AppMode = 'single' | 'bulk';