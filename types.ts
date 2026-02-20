

import type { ToolPreset } from './types/whiteboardTypes'; // Import ToolPreset

export type Role = 'teacher' | 'student' | 'guardian';

export interface User {
  uid: string;
  name: string;
  role: Role;
  avatarUrl: string;
  pendingAvatarUrl?: string;
  email: string;
  studentIds?: string[];
  guardianIds?: string[];
  courseIds?: string[];
  watchedCourseIds?: string[];
  tinkerCadUsername?: string;
  tinkerCadPassword?: string;
  notes?: string;
  birthdate?: string;
  address?: string;
  personalDocuments?: {
    name: string;
    url: string;
    uploadedAt: string;
  }[];
  whiteboardPresets?: ToolPreset[]; // Added for cloud persistence
}

export interface GridLineConfig {
  spacing: number;
  color: string;
  opacity: number;
}

export interface GridConfig {
  enabled: boolean;
  teacherOnly: boolean;
  minor: GridLineConfig;
  medium: GridLineConfig;
  major: GridLineConfig;
}

export interface WhiteboardBoard {
  id: string;
  name: string;
  timestamp: number;
  bgColor?: string;
  bgImageUrl?: string;
  width?: number; // Canvas Width in px
  height?: number; // Canvas Height in px
  grid?: GridConfig;
}

export interface WhiteboardPage {
  id: string;
  boardId: string;
  order: number;
  thumbnailUrl?: string; // Optional for future use
  keyframeIds?: string[]; // Lista ordenada de IDs de fotogramas clave
}

export interface WhiteboardLayer {
  id: string;
  boardId: string;
  pageId?: string; // Layers now belong to a page conceptually, or shared. For simplicity, we'll keep them shared or link to board, but filter content by page.
  name: string;
  order: number;
  visible: boolean;
  opacity?: number; // Opacidad de la capa (0 a 1)
}

export interface WhiteboardStroke {
  id: string;
  boardId: string;
  pageId?: string; // Link to specific page
  layerId?: string;
  keyframeId?: string; // Link to specific keyframe/animation step
  points: Point[];
  color: string;
  size: number;
  opacity?: number;
  timestamp: number;
  type: 'pen' | 'eraser' | 'marker';
  deleted?: boolean;
  options?: StrokeOptions;
  groupId?: string;
}

export interface WhiteboardImage {
  id: string;
  boardId: string;
  pageId?: string; // Link to specific page
  layerId?: string;
  keyframeId?: string; // Link to specific keyframe
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  timestamp: number;
  deleted?: boolean;
  opacity?: number;
  teacherOnly?: boolean;
  crop?: {
    x: number; // Porcentaje 0-1
    y: number; // Porcentaje 0-1
    width: number; // Porcentaje 0-1
    height: number; // Porcentaje 0-1
  };
  groupId?: string;
}

export interface WhiteboardText {
  id: string;
  boardId: string;
  pageId?: string; // Link to specific page
  layerId?: string;
  keyframeId?: string; // Link to specific keyframe
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  timestamp: number;
  deleted?: boolean;
  fontSize?: number;
  color?: string;
  opacity?: number;
  teacherOnly?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom'; // Added vertical alignment
  fontFamily?: 'sans' | 'mono' | 'serif' | 'hand' | 'display' | 'code' | 'roboto' | 'lobster' | 'oswald' | 'playfair' | 'montserrat' | 'pacifico' | 'dancing';
  backgroundColor?: string;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  groupId?: string;
}

// New: Library Item
export interface LibraryItem {
  id: string;
  teacherId: string;
  type: 'group' | 'image' | 'svg';
  name: string;
  thumbnailUrl?: string; // Preview URL
  data: any; // Serialized strokes/images/texts, normalized to (0,0)
  isQuick: boolean; // Show in quick bar
  folderId?: string;
  timestamp: number;
}

// New: Library Class (Whole Board Template)
export interface LibraryClass {
  id: string;
  teacherId: string;
  name: string;
  description?: string;
  timestamp: number;
  // Data contains the full snapshot of the board
  data: {
    board: Partial<WhiteboardBoard>;
    pages: Partial<WhiteboardPage>[];
    layers: Partial<WhiteboardLayer>[];
    strokes: Partial<WhiteboardStroke>[];
    images: Partial<WhiteboardImage>[];
    texts: Partial<WhiteboardText>[];
  };
}

export interface LibraryFolder {
  id: string;
  teacherId: string;
  name: string;
}

export interface BillboardPost {
  id: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  content: string;
  imageUrls: string[];
}

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface StrokeOptions {
  thinning: number;
  smoothing: number;
  streamline: number;
  simulatePressure?: boolean;
  // Extended options used in whiteboard
  filled?: boolean;
  sharpCorners?: boolean;
  pressureWeight?: number;
  velocityWeight?: number;
  velocityThreshold?: number;
  pointThrottle?: number;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
}

export interface Attachment {
  name: string;
  url: string;
}

export interface Subtitle {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  attachments?: Attachment[];
  forGuardian?: string;
}

export interface Topic {
  id: string;
  title: string;
  subtitles: Subtitle[];
  forGuardian?: string;
}

export interface ContentUnit {
  id: string;
  title: string;
  topics: Topic[];
  forGuardian?: string;
  order?: number;
  status?: 'published' | 'draft';
}

export interface Answer {
  questionId: string;
  text: string;
  imageUrl?: string;
}

export interface AssignmentSubmission {
  studentName: string;
  studentId: string;
  submittedAt: string;
  answers: Answer[];
  grade?: number;
  feedback?: string;
}

export interface Question {
  id: string;
  text: string;
  imageUrls?: string[];
  attachments?: Attachment[];
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  submissions: AssignmentSubmission[];
  imageUrls?: string[];
  attachments?: Attachment[];
  questions: Question[];
  forGuardian?: string;
  assignedTo?: string[];
  status?: 'published' | 'draft';
}

export type QuizQuestionType = 'multiple-choice' | 'text' | 'image-text' | 'audio' | 'video' | 'link';

export interface QuizQuestion {
  id: string;
  text: string;
  type: QuizQuestionType;
  options?: string[];
  correctAnswerIndex?: number;
}

export type QuizAnswer = number | string | { text?: string, fileUrl?: string };

export interface QuizSubmission {
  studentId: string;
  studentName: string;
  submittedAt: string;
  answers: (QuizAnswer | null)[];
  score: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  questions: QuizQuestion[];
  submissions: QuizSubmission[];
  status?: 'published' | 'draft';
  assignedTo?: string[];
}


export type KanbanStatus = 'To Do' | 'In Progress' | 'Done';

export interface ProjectTask {
  id: string;
  title: string;
  status: KanbanStatus;
}

export interface ProjectStep {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  attachments?: Attachment[];
  forGuardian?: string;
}

export interface ProjectResource {
  id: string;
  name: string;
  description: string;
  quantity: number;
  imageUrl: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  team: string[];
  leaderId?: string;
  tasks: ProjectTask[];
  steps: ProjectStep[];
  materialsAndTools?: ProjectResource[];
  forGuardian?: string;
  assignedTo?: string[];
  status?: 'published' | 'draft';
}

export interface ResourceLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  imageUrl?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  accessCode?: string; // New field for sharing rooms
  content: ContentUnit[];
  assignments: Assignment[];
  quizzes: Quiz[];
  projects: Project[];
  resources?: ResourceLink[];
  groups?: Group[];
  activeThemeId?: string;
  teacherId?: string;
  teacherName?: string;
  clipboard?: {
    content: string;
    imageUrls: { url: string; uploadedAt: string }[];
  };
}

export interface NewCourse {
  title: string;
  description: string;
  accessCode: string; // New field
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  imageUrl?: string;
  timestamp: string;
  isConversationStart?: boolean;
}

export interface ThemePreset {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
  };
}

export interface ForumMessage {
  id: string;
  courseId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  authorRole: Role;
  text: string;
  imageUrl?: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
}
