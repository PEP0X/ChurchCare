export type FieldType = 'text' | 'textarea' | 'image' | 'number' | 'date' | 'checkbox' | 'select';

export interface FieldRect {
  left: number;   // percentage 0 - 100
  top: number;    // percentage 0 - 100
  width: number;  // percentage 0 - 100
  height: number; // percentage 0 - 100
}

export interface FieldStyle {
  fontSize?: number | 'auto'; // px at 100% scale, or 'auto' to automatically fit box height and length
  textAlign?: 'right' | 'center' | 'left';
  isMono?: boolean;
  isBold?: boolean;
  textColor?: string;
  borderColor?: string;
}

export interface FieldConfig {
  id: string;
  page: number; // 1 to 6
  type: FieldType;
  label: string;
  binding: string; // e.g. "page1.church_study_id" or "page2.husband.name"
  placeholder?: string;
  rect: FieldRect;
  style?: FieldStyle;
  options?: string[]; // for select/checkbox
}

export type DocumentLayout = Record<number, FieldConfig[]>;
