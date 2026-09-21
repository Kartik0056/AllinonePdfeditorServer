/**
 * @pdfeditor/shared - Core type definitions
 * Shared across SDK, frontend, and backend
 */

// ─── Element Types ───────────────────────────────────────────────

export type ElementType = 'text' | 'image' | 'shape' | 'annotation' | 'signature' | 'drawing';

export type AnnotationType = 'highlight' | 'underline' | 'strikethrough' | 'freehand' | 'sticky-note';

export type ShapeType = 'rectangle' | 'circle' | 'arrow' | 'line';

export type ToolMode =
  | 'select'
  | 'text'
  | 'image'
  | 'draw'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'shape'
  | 'sign'
  | 'eraser'
  | 'sticky-note';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

// ─── Base Element ────────────────────────────────────────────────

export interface BaseElement {
  id: string;
  type: ElementType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  /** Whether this is an original PDF element or user-added */
  isOriginal: boolean;
  /** Timestamp of last modification */
  updatedAt: number;
}

// ─── Text Element ────────────────────────────────────────────────

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline' | 'line-through';
  color: string;
  backgroundColor: string;
  textAlign: TextAlign;
  lineHeight: number;
  /** Original PDF text operator data for stream editing */
  streamData?: {
    operatorIndex: number;
    streamRef: string;
    originalText: string;
    encoding: string;
  };
  /** Whether this text was extracted via OCR */
  isOCR: boolean;
  /** Whether this element was modified from original */
  isEdited?: boolean;
  /** Original bounding box prior to edit */
  originalBounds?: { x: number; y: number; width: number; height: number };
  /** Original text before edit */
  originalText?: string;
}

// ─── Image Element ───────────────────────────────────────────────

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  /** Original image data as base64 or blob URL */
  originalSrc: string;
  /** Image format */
  format: 'jpg' | 'jpeg' | 'png' | 'webp';
  /** Crop rectangle (relative to image) */
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// ─── Shape Element ───────────────────────────────────────────────

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  /** For arrows/lines: end points relative to element position */
  points?: { x: number; y: number }[];
}

// ─── Annotation Element ──────────────────────────────────────────

export interface AnnotationElement extends BaseElement {
  type: 'annotation';
  annotationType: AnnotationType;
  color: string;
  /** For freehand drawing: path points */
  paths?: { x: number; y: number }[];
  /** For sticky notes: note content */
  noteContent?: string;
  strokeWidth: number;
}

// ─── Signature Element ───────────────────────────────────────────

export interface SignatureElement extends BaseElement {
  type: 'signature';
  /** Signature as data URL (drawn) or image URL (uploaded) */
  signatureData: string;
  /** How the signature was created */
  source: 'draw' | 'upload';
}

// ─── Drawing Element ─────────────────────────────────────────────

export interface DrawingElement extends BaseElement {
  type: 'drawing';
  paths: { x: number; y: number }[];
  strokeColor: string;
  strokeWidth: number;
}

// ─── Union Type ──────────────────────────────────────────────────

export type PDFElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | AnnotationElement
  | SignatureElement
  | DrawingElement;

// ─── Page ────────────────────────────────────────────────────────

export interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  /** Index (0-based) of the page in the original PDF, or undefined if blank/new */
  originalPageIndex?: number;
  /** Thumbnail data URL */
  thumbnail?: string;
  elements: PDFElement[];
}

// ─── Document Model ──────────────────────────────────────────────

export interface DocumentModel {
  id: string;
  fileName: string;
  totalPages: number;
  pages: PageInfo[];
  metadata: PDFMetadata;
  /** Original PDF bytes for reference */
  originalSize: number;
  createdAt: number;
  updatedAt: number;
}

// ─── PDF Metadata ────────────────────────────────────────────────

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
}

// ─── Editor State ────────────────────────────────────────────────

export interface EditorState {
  document: DocumentModel | null;
  currentPage: number;
  zoom: number;
  tool: ToolMode;
  selectedElementId: string | null;
  isLoading: boolean;
  error: string | null;
}

// ─── History ─────────────────────────────────────────────────────

export type CommandType =
  | 'ADD_ELEMENT'
  | 'DELETE_ELEMENT'
  | 'EDIT_TEXT'
  | 'MOVE_ELEMENT'
  | 'RESIZE_ELEMENT'
  | 'ROTATE_ELEMENT'
  | 'EDIT_PROPERTIES'
  | 'ADD_PAGE'
  | 'DELETE_PAGE'
  | 'REORDER_PAGE'
  | 'ROTATE_PAGE';

export interface HistoryCommand {
  id: string;
  type: CommandType;
  timestamp: number;
  description: string;
  /** Data needed to undo */
  undoData: unknown;
  /** Data needed to redo */
  redoData: unknown;
}

// ─── Conversion ──────────────────────────────────────────────────

export type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'webp' | 'heic' | 'heif' | 'tiff' | 'gif' | 'avif';

export type PageSize = 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5' | 'Custom';

export type Orientation = 'portrait' | 'landscape';

export type CompressionLevel = 'low' | 'medium' | 'high';

export interface ConversionOptions {
  format: ImageFormat;
  quality: number;
  dpi: number;
  pages?: number[] | 'all';
}

export interface ImageToPDFOptions {
  pageSize: PageSize;
  orientation: Orientation;
  margin: number;
  fitToPage: boolean;
  customWidth?: number;
  customHeight?: number;
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  reduction: number;
  data: Uint8Array;
}

// ─── API Types ───────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthTokens {
  token: string;
  user: AuthUser;
}

export interface ProjectInfo {
  id: string;
  userId: string;
  name: string;
  originalFileName: string;
  fileSize: number;
  pageCount: number;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Split Options ───────────────────────────────────────────────

export interface SplitOptions {
  mode: 'every-page' | 'by-range' | 'extract';
  ranges?: string[];
  pages?: number[];
}

export interface MergeFileInfo {
  id: string;
  name: string;
  pageCount: number;
  size: number;
  data: ArrayBuffer;
  order: number;
}
