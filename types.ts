export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  content?: Blob | null; // Optional: Null means we haven't downloaded the PDF yet
}

export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
}

export type SenderRole = 'user' | 'ai' | 'system';

export interface Message {
  id: string;
  role: SenderRole;
  content: string;
  timestamp: number;
  relatedDocs?: string[]; // IDs of docs used for RAG
}

export enum DocCategory {
  CASE_FILE = 'case_file',
  LAW_BASE = 'law_base',
}

// Google Picker Types (Simplified)
export interface GooglePickerDocument {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
  plan?: 'free' | 'premium';
  isGuest?: boolean; // New field to track guest status
}