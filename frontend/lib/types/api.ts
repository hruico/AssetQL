// Session types
export type SessionPhase = 
  | 'UPLOAD' 
  | 'SINGLE_ITERATION' 
  | 'BATCH_REVIEW' 
  | 'STYLE_LOCKED' 
  | 'AUTOMATION' 
  | 'COMPLETE';

export interface Session {
  sessionId: string;
  userId: string;
  currentPhase: SessionPhase;
  phase: SessionPhase; // Alias for currentPhase for frontend compatibility
  createdAt: string | number;
  updatedAt: string | number;
  masterPrompt?: string;
  styleProfileId?: string;
  batchId?: string;
  lockedStyleElements?: string[];
  activeRefinements?: string[];
}

// Style types
export interface StyleDescriptors {
  colorPalette: string[];
  composition: string;
  texture: string;
  lighting: string;
  artStyle: string;
  mood: string;
  negativePrompt: string;
}

export interface StyleProfile {
  styleProfileId: string;
  userId: string;
  name?: string;
  referenceImageKey: string;
  referenceUrl?: string;
  descriptors: StyleDescriptors;
  lockedParams?: string[];
  deviationThreshold?: number;
  createdAt: number;
}

// Batch types
export interface Batch {
  batchId: string;
  userId: string;
  sessionId: string;
  styleProfileId: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

// Task types
export interface Task {
  taskId: string;
  batchId: string;
  prompt: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  retryCount: number;
  assetId?: string;
  styleScore?: number;
  createdAt: string;
  updatedAt: string;
}

// Asset types
export interface Asset {
  assetId: string;
  batchId: string;
  userId: string;
  s3Key: string;
  thumbnailKey?: string;
  tags?: string[];
  category?: string;
  styleScore?: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Feedback types
export interface Feedback {
  feedbackId: string;
  sessionId: string;
  userId: string;
  iterationNumber: number;
  assetId: string;
  feedbackText: string;
  lockedElements?: string[];
  activeRefinements?: string[];
  createdAt: string;
}

// API request/response types
export interface CreateSessionRequest {
  name?: string;
}

export interface CreateSessionResponse {
  session: Session;
}

export interface UpdateSessionPhaseRequest {
  phase: SessionPhase;
}

export interface UpdateSessionPhaseResponse {
  session: Session;
}

export interface CreateStyleProfileRequest {
  referenceImage: File;
}

export interface CreateStyleProfileResponse {
  styleProfile: StyleProfile;
}

export interface CreateBatchRequest {
  sessionId: string;
  styleProfileId: string;
  csvData: string;
  promptTemplate: string;
}

export interface CreateBatchResponse {
  batch: Batch;
  tasksCreated: number;
}

export interface SubmitFeedbackRequest {
  sessionId: string;
  assetId: string;
  feedbackText: string;
  lockedElements?: string[];
}

export interface SubmitFeedbackResponse {
  feedback: Feedback;
  refinedPrompt?: string;
}

export interface ExportRequest {
  sessionId: string;
  format: 'unity' | 'cms' | 'ecommerce' | 'social';
  assetIds?: string[];
}

export interface ExportResponse {
  exportId: string;
  downloadUrl: string;
  expiresAt: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'TASK_UPDATE' | 'BATCH_UPDATE' | 'SESSION_UPDATE' | 'ERROR';
  data: any;
}

export interface TaskUpdateMessage extends WebSocketMessage {
  type: 'TASK_UPDATE';
  data: {
    taskId: string;
    batchId: string;
    status: Task['status'];
    assetId?: string;
    styleScore?: number;
  };
}

export interface BatchUpdateMessage extends WebSocketMessage {
  type: 'BATCH_UPDATE';
  data: {
    batchId: string;
    completedTasks: number;
    totalTasks: number;
    status: Batch['status'];
  };
}

// Error types
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
