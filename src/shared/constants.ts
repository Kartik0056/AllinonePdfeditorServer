/**
 * @pdfeditor/shared - Constants
 */

/** Standard page sizes in points (1 point = 1/72 inch) */
export const PAGE_SIZES = {
  A3: { width: 841.89, height: 1190.55 },
  A4: { width: 595.28, height: 841.89 },
  A5: { width: 419.53, height: 595.28 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
} as const;

/** Default zoom levels */
export const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 200, 300, 400] as const;

export const MIN_ZOOM = 10;
export const MAX_ZOOM = 500;
export const DEFAULT_ZOOM = 100;

/** Standard PDF fonts */
export const STANDARD_FONTS = [
  'Helvetica',
  'Times-Roman',
  'Courier',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Helvetica-BoldOblique',
  'Times-Bold',
  'Times-Italic',
  'Times-BoldItalic',
  'Courier-Bold',
  'Courier-Oblique',
  'Courier-BoldOblique',
  'Symbol',
  'ZapfDingbats',
] as const;

/** Web-safe fonts for the editor UI */
export const EDITOR_FONTS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Trebuchet MS',
  'Palatino',
  'Garamond',
  'Comic Sans MS',
  'Impact',
] as const;

/** Font size options */
export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 64, 72, 96] as const;

/** File upload limits */
export const MAX_FILE_SIZE_MB = 100;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Accepted file types */
export const ACCEPTED_PDF_TYPES = ['application/pdf'] as const;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

/** PDF DPI */
export const PDF_DPI = 72;
export const SCREEN_DPI = 96;

/** Colors */
export const ANNOTATION_COLORS = [
  '#FFEB3B', // Yellow
  '#FF9800', // Orange
  '#F44336', // Red
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#3F51B5', // Indigo
  '#2196F3', // Blue
  '#00BCD4', // Cyan
  '#4CAF50', // Green
  '#8BC34A', // Light Green
] as const;

/** Default element properties */
export const DEFAULT_TEXT_PROPS = {
  fontFamily: 'Helvetica',
  fontSize: 16,
  fontWeight: 'normal' as const,
  fontStyle: 'normal' as const,
  textDecoration: 'none' as const,
  color: '#000000',
  backgroundColor: 'transparent',
  textAlign: 'left' as const,
  lineHeight: 1.2,
  opacity: 1,
  rotation: 0,
};

export const DEFAULT_SHAPE_PROPS = {
  strokeColor: '#000000',
  strokeWidth: 2,
  fillColor: 'transparent',
  opacity: 1,
  rotation: 0,
};

export const DEFAULT_ANNOTATION_PROPS = {
  color: '#FFEB3B',
  strokeWidth: 2,
  opacity: 0.5,
};
