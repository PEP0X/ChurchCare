import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getTemplatePageImage } from '../../utils/templateImages';
import {
  MousePointer,
  Type,
  AlignLeft,
  Image as ImageIcon,
  CheckSquare,
  Hash,
  ListFilter,
  Trash2,
  Copy,
  RotateCcw,
  Save,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Check,
  FileCode,
  X,
  Undo2,
  Redo2,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Search,
  HelpCircle,
  Layers,
  Sliders,
  Move,
  Eye,
  Hand,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Minus,
  Zap,
  Tag,
  Crosshair,
  Equal,
  MoveHorizontal,
  MoveVertical,
  StretchHorizontal,
  StretchVertical,
  LayoutGrid,
  Home
} from 'lucide-react';
import { DocumentLayout, FieldConfig, FieldType, FieldRect } from '../../types/layout';
import { DEFAULT_DOCUMENT_LAYOUT } from '../../config/defaultDocumentLayout';

interface VisualCoordinateStudioProps {
  layout: DocumentLayout;
  onSaveLayout: (newLayout: DocumentLayout) => void;
  onCloseStudio: () => void;
  currentPage?: number;
}

type StudioTool =
  | 'select'
  | 'hand'
  | 'text'
  | 'textarea'
  | 'image'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'dropdown';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move' | null;

interface ContextMenuState {
  x: number;
  y: number;
  fieldId: string;
}

export const EGYPTIAN_CHURCHES_PRESET = [
  "كنيسة السيدة العذراء والقديس يوسف النجار - الخصوص",
  "كنيسة السيدة العذراء والرسولين بطرس وبولس - الخصوص",
  "كنيسة البابا أثناسيوس الرسول والانبا بيشوى - الخصوص",
  "كنيسة السيدة العذراء والقديس ابي سيفين - الخصوص",
  "كنيسة الانبا كاراس والانبا ابرام - الخصوص",
  "كنيسة السيدة العذراء والشهيد العظيم أبانوب - الخصوص",
  "كنيسة السيدة العذراء والانبا موسي - الخصوص",
  "كنيسة السيدة العذراء والملاك ميخائيل - الخصوص",
  "كنيسة الشهيد العظيم مارمينا والبابا كيرلس السادس - الخصوص",
  "كنيسة الشهيد العظيم مارجرجس والبابا ديسقوروس - الخصوص",
  "كنيسة السيدة العذراء والقديس ماريوحنا الحبيب - الخصوص",
  "مذبح الاميرين تادرس- ارض عيشة - الخصوص",
  "كنيسة الشهيد العظيم مارجرجس - قها",
  "كنيسة الشهيد العظيم مارجرجس - طوخ",
  "كنيسة القديسة الشهيدة دميانه - ميت كنانة",
  "كنيسة الشهيد العظيم مارجرجس - بلتان",
  "كنيسة الشهيد العظيم مارمينا العجايبى - ساحل دجوى",
  "كنيسة السيدة العذراء والقديس العظيم ابي سيفين - دجوى",
  "كنيسة رئيس الملائكة الجليل ميخائيل - القلزم",
  "كنيسة السيدة العذراء والقديس مارمرقس الرسول - كفر شبين",
  "كنيسة الشهيد العظيم مارجرجس - منيه شبين",
  "كنيسة البابا كيرلس السادس - الحصافة",
  "كنيسة رئيس الملائكة الجليل ميخائيل - القشيش",
  "كنيسة السيدة العذراء والقديس ابي سيفين - السلمانية",
  "كنيسة الشهيد العظيم مارجرجس والانبا كاراس - نوى",
  "كنيسة السيدة العذراء - مساكن ابو زعبل",
  "كنيسة الشهيد العظيم مارجرجس - ابو زعبل",
  "كنيسة السيدة العذراء ورئيس الملائكة الجليل ميخائيل - العكرشة",
  "كنيسة السيدة العذراء والبابا بطرس خاتم الشهداء - الخانكة",
  "كنيسة الشهيد العظيم مارمينا والبابا كيرلس السادس - الجبل الاصفر",
  "كنيسة السيدة العذراء والقديس ابانوب - القلج",
  "كنيسة الشهيد العظيم ابي سيفين والقديسة دميانة - القلج",
  "كنيسة السيدة العذراء والامير تادرس - القلج",
  "كنيسة السيدة العذراء والانبا بيشوى - المنية"
];

export const VisualCoordinateStudio: React.FC<VisualCoordinateStudioProps> = ({
  layout,
  onSaveLayout,
  onCloseStudio,
  currentPage: initialPage = 1
}) => {
  const [page, setPage] = useState<number>(initialPage);
  const [activeTool, setActiveTool] = useState<StudioTool>('select');

  // Multi-selection support (Figma / Photoshop style)
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const selectedFieldId = selectedFieldIds[selectedFieldIds.length - 1] || null;

  const [scale, setScale] = useState<number>(0.95);
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [fieldSearch, setFieldSearch] = useState<string>('');
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);

  // Custom gap distance for Spacing Tools (in %)
  const [customGap, setCustomGap] = useState<number>(1.0);

  // Undo / Redo History Stacks (Photoshop / Figma style)
  const [currentLayout, setCurrentLayout] = useState<DocumentLayout>(layout);
  const [undoStack, setUndoStack] = useState<DocumentLayout[]>([]);
  const [redoStack, setRedoStack] = useState<DocumentLayout[]>([]);

  // Internal clipboard for Copy/Paste
  const [clipboardFields, setClipboardFields] = useState<FieldConfig[]>([]);

  // New Dropdown Option input state
  const [newOptionInput, setNewOptionInput] = useState<string>('');
  const [showBulkOptionsModal, setShowBulkOptionsModal] = useState<boolean>(false);
  const [bulkInputText, setBulkInputText] = useState<string>('');
  const [optionsSearchFilter, setOptionsSearchFilter] = useState<string>('');

  // Live cursor position indicator (HUD)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Smart Snapping Alignment Guides (Photoshop / Figma Smart Guides)
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number }>({});

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Spacebar Pan State
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isAltPressed, setIsAltPressed] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    handle: ResizeHandle;
    startX: number;
    startY: number;
    originalRect: FieldRect | null;
    originalRects: { [id: string]: FieldRect };
    currentDrawingRect: FieldRect | null;
  }>({
    isDragging: false,
    handle: null,
    startX: 0,
    startY: 0,
    originalRect: null,
    originalRects: {},
    currentDrawingRect: null
  });

  const pageFields = currentLayout[page] || [];
  const selectedFields = pageFields.filter((f) => selectedFieldIds.includes(f.id));
  const primaryField = selectedFields[selectedFields.length - 1] || null;

  // Filtered fields for Layers panel search
  const filteredFields = pageFields.filter(
    (f) =>
      f.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
      f.binding.toLowerCase().includes(fieldSearch.toLowerCase()) ||
      f.id.toLowerCase().includes(fieldSearch.toLowerCase())
  );

  const getPageImage = (p: number) => getTemplatePageImage(p);

  // Push state to undo stack before mutation
  const pushUndo = useCallback((layoutSnapshot: DocumentLayout) => {
    setUndoStack((prev) => [...prev.slice(-30), layoutSnapshot]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [currentLayout, ...prev]);
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setCurrentLayout(previous);
  }, [undoStack, currentLayout]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setUndoStack((prev) => [...prev, currentLayout]);
    setRedoStack((prev) => prev.slice(1));
    setCurrentLayout(next);
  }, [redoStack, currentLayout]);

  // Update a single field in the layout
  const updateField = useCallback(
    (fieldId: string, updates: Partial<FieldConfig>, recordUndo = false) => {
      if (recordUndo) {
        pushUndo(currentLayout);
      }
      setCurrentLayout((prev) => {
        const list = prev[page] || [];
        const nextList = list.map((f) => (f.id === fieldId ? { ...f, ...updates } : f));
        return { ...prev, [page]: nextList };
      });
    },
    [page, pushUndo, currentLayout]
  );

  // Delete selected fields
  const deleteSelectedFields = useCallback(() => {
    if (selectedFieldIds.length === 0) return;
    pushUndo(currentLayout);
    setCurrentLayout((prev) => {
      const list = prev[page] || [];
      return { ...prev, [page]: list.filter((f) => !selectedFieldIds.includes(f.id)) };
    });
    setSelectedFieldIds([]);
    setContextMenu(null);
  }, [page, selectedFieldIds, pushUndo, currentLayout]);

  // Duplicate selected fields (Photoshop / Figma: Ctrl+D / Alt+Drag)
  const duplicateSelectedFields = useCallback(
    (offset = { x: 1.5, y: 1.5 }) => {
      if (selectedFields.length === 0) return;
      pushUndo(currentLayout);
      const newDuplicates: FieldConfig[] = selectedFields.map((field) => ({
        ...field,
        id: `${field.type}_${Date.now().toString().slice(-4)}_${Math.floor(Math.random() * 900 + 100)}`,
        label: `${field.label} (نسخة)`,
        rect: {
          ...field.rect,
          left: Math.min(100 - field.rect.width, +(field.rect.left + offset.x).toFixed(2)),
          top: Math.min(100 - field.rect.height, +(field.rect.top + offset.y).toFixed(2))
        }
      }));

      setCurrentLayout((prev) => ({
        ...prev,
        [page]: [...(prev[page] || []), ...newDuplicates]
      }));
      setSelectedFieldIds(newDuplicates.map((d) => d.id));
      setContextMenu(null);
    },
    [page, selectedFields, pushUndo, currentLayout]
  );

  // Copy to internal clipboard
  const handleCopy = useCallback(() => {
    if (selectedFields.length === 0) return;
    setClipboardFields(selectedFields);
    setSaveToast(`تم نسخ ${selectedFields.length} حقل للحافظة`);
    setTimeout(() => setSaveToast(null), 1500);
    setContextMenu(null);
  }, [selectedFields]);

  // Paste from internal clipboard
  const handlePaste = useCallback(() => {
    if (clipboardFields.length === 0) return;
    pushUndo(currentLayout);
    const pasted: FieldConfig[] = clipboardFields.map((f, i) => ({
      ...f,
      id: `${f.type}_${Date.now().toString().slice(-4)}_${i}`,
      label: `${f.label} (لصق)`,
      rect: {
        ...f.rect,
        left: Math.min(100 - f.rect.width, +(f.rect.left + 2).toFixed(2)),
        top: Math.min(100 - f.rect.height, +(f.rect.top + 2).toFixed(2))
      }
    }));

    setCurrentLayout((prev) => ({
      ...prev,
      [page]: [...(prev[page] || []), ...pasted]
    }));
    setSelectedFieldIds(pasted.map((p) => p.id));
  }, [clipboardFields, currentLayout, page, pushUndo]);

  // =========================================================================
  // FIGMA POSITIONING & ALIGNMENT TOOLS (Center Together & Spacing)
  // =========================================================================

  // Align Multiple Components Together or to Page
  const alignComponents = (
    direction:
      | 'left'
      | 'centerH'
      | 'right'
      | 'top'
      | 'centerV'
      | 'bottom'
      | 'pageCenterH'
      | 'pageCenterV'
      | 'fullWidth'
  ) => {
    if (selectedFields.length === 0) return;
    pushUndo(currentLayout);

    if (selectedFields.length === 1) {
      // Single item: align relative to page margins / center
      const f = selectedFields[0];
      const r = { ...f.rect };
      if (direction === 'left') r.left = 8.5;
      else if (direction === 'centerH' || direction === 'pageCenterH') r.left = +(50 - r.width / 2).toFixed(2);
      else if (direction === 'right') r.left = +(91.5 - r.width).toFixed(2);
      else if (direction === 'top') r.top = 5.0;
      else if (direction === 'centerV' || direction === 'pageCenterV') r.top = +(50 - r.height / 2).toFixed(2);
      else if (direction === 'bottom') r.top = +(95.0 - r.height).toFixed(2);
      else if (direction === 'fullWidth') {
        r.left = 8.5;
        r.width = 83.0;
      }
      updateField(f.id, { rect: r });
      return;
    }

    // Multiple items: align relative to selection bounding box
    const minLeft = Math.min(...selectedFields.map((f) => f.rect.left));
    const maxRight = Math.max(...selectedFields.map((f) => f.rect.left + f.rect.width));
    const minTop = Math.min(...selectedFields.map((f) => f.rect.top));
    const maxBottom = Math.max(...selectedFields.map((f) => f.rect.top + f.rect.height));
    const commonCenterH = (minLeft + maxRight) / 2;
    const commonCenterV = (minTop + maxBottom) / 2;

    setCurrentLayout((prev) => {
      const list = prev[page] || [];
      const nextList = list.map((f) => {
        if (!selectedFieldIds.includes(f.id)) return f;
        const r = { ...f.rect };
        if (direction === 'left') {
          r.left = minLeft;
        } else if (direction === 'centerH') {
          r.left = +(commonCenterH - r.width / 2).toFixed(2);
        } else if (direction === 'right') {
          r.left = +(maxRight - r.width).toFixed(2);
        } else if (direction === 'top') {
          r.top = minTop;
        } else if (direction === 'centerV') {
          r.top = +(commonCenterV - r.height / 2).toFixed(2);
        } else if (direction === 'bottom') {
          r.top = +(maxBottom - r.height).toFixed(2);
        } else if (direction === 'pageCenterH') {
          const groupWidth = maxRight - minLeft;
          const shiftX = (100 - groupWidth) / 2 - minLeft;
          r.left = Math.max(0, Math.min(100 - r.width, +(r.left + shiftX).toFixed(2)));
        } else if (direction === 'pageCenterV') {
          const groupHeight = maxBottom - minTop;
          const shiftY = (100 - groupHeight) / 2 - minTop;
          r.top = Math.max(0, Math.min(100 - r.height, +(r.top + shiftY).toFixed(2)));
        } else if (direction === 'fullWidth') {
          r.left = 8.5;
          r.width = 83.0;
        }
        return { ...f, rect: r };
      });
      return { ...prev, [page]: nextList };
    });
  };

  // Distribute Spacing Evenly (Figma Distribute Vertical / Horizontal)
  const distributeSpacing = (axis: 'vertical' | 'horizontal') => {
    if (selectedFields.length < 3) {
      setSaveToast('حدد 3 حقول على الأقل لتوزيع المسافات بالتساوي');
      setTimeout(() => setSaveToast(null), 2000);
      return;
    }
    pushUndo(currentLayout);

    if (axis === 'vertical') {
      const sorted = [...selectedFields].sort((a, b) => a.rect.top - b.rect.top);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalHeight = sorted.reduce((sum, f) => sum + f.rect.height, 0);
      const totalSpan = (last.rect.top + last.rect.height) - first.rect.top;
      const gap = Math.max(0, (totalSpan - totalHeight) / (sorted.length - 1));

      const newTops: { [id: string]: number } = {};
      let currentTop = first.rect.top;
      sorted.forEach((f, idx) => {
        if (idx === 0) {
          newTops[f.id] = f.rect.top;
          currentTop += f.rect.height + gap;
        } else {
          newTops[f.id] = +currentTop.toFixed(2);
          currentTop += f.rect.height + gap;
        }
      });

      setCurrentLayout((prev) => {
        const list = prev[page] || [];
        return {
          ...prev,
          [page]: list.map((f) =>
            newTops[f.id] !== undefined
              ? { ...f, rect: { ...f.rect, top: newTops[f.id] } }
              : f
          )
        };
      });
      setSaveToast('تم توزيع المسافات الرأسية بالتساوي');
      setTimeout(() => setSaveToast(null), 1500);
    } else {
      const sorted = [...selectedFields].sort((a, b) => a.rect.left - b.rect.left);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalWidth = sorted.reduce((sum, f) => sum + f.rect.width, 0);
      const totalSpan = (last.rect.left + last.rect.width) - first.rect.left;
      const gap = Math.max(0, (totalSpan - totalWidth) / (sorted.length - 1));

      const newLefts: { [id: string]: number } = {};
      let currentLeft = first.rect.left;
      sorted.forEach((f, idx) => {
        if (idx === 0) {
          newLefts[f.id] = f.rect.left;
          currentLeft += f.rect.width + gap;
        } else {
          newLefts[f.id] = +currentLeft.toFixed(2);
          currentLeft += f.rect.width + gap;
        }
      });

      setCurrentLayout((prev) => {
        const list = prev[page] || [];
        return {
          ...prev,
          [page]: list.map((f) =>
            newLefts[f.id] !== undefined
              ? { ...f, rect: { ...f.rect, left: newLefts[f.id] } }
              : f
          )
        };
      });
      setSaveToast('تم توزيع المسافات الأفقية بالتساوي');
      setTimeout(() => setSaveToast(null), 1500);
    }
  };

  // Fixed Spacing Tool (رص بمسافة محددة بالأرقام)
  const applyFixedSpacing = (axis: 'vertical' | 'horizontal', gapValue: number) => {
    if (selectedFields.length < 2) {
      setSaveToast('حدد حقلين على الأقل لتطبيق المسافة');
      setTimeout(() => setSaveToast(null), 2000);
      return;
    }
    pushUndo(currentLayout);

    if (axis === 'vertical') {
      const sorted = [...selectedFields].sort((a, b) => a.rect.top - b.rect.top);
      const newTops: { [id: string]: number } = {};
      let curr = sorted[0].rect.top;
      sorted.forEach((f) => {
        newTops[f.id] = +curr.toFixed(2);
        curr += f.rect.height + gapValue;
      });

      setCurrentLayout((prev) => {
        const list = prev[page] || [];
        return {
          ...prev,
          [page]: list.map((f) =>
            newTops[f.id] !== undefined
              ? { ...f, rect: { ...f.rect, top: newTops[f.id] } }
              : f
          )
        };
      });
      setSaveToast(`تم ضبط التباعد الرأسي بمقدار ${gapValue}%`);
      setTimeout(() => setSaveToast(null), 1500);
    } else {
      const sorted = [...selectedFields].sort((a, b) => a.rect.left - b.rect.left);
      const newLefts: { [id: string]: number } = {};
      let curr = sorted[0].rect.left;
      sorted.forEach((f) => {
        newLefts[f.id] = +curr.toFixed(2);
        curr += f.rect.width + gapValue;
      });

      setCurrentLayout((prev) => {
        const list = prev[page] || [];
        return {
          ...prev,
          [page]: list.map((f) =>
            newLefts[f.id] !== undefined
              ? { ...f, rect: { ...f.rect, left: newLefts[f.id] } }
              : f
          )
        };
      });
      setSaveToast(`تم ضبط التباعد الأفقي بمقدار ${gapValue}%`);
      setTimeout(() => setSaveToast(null), 1500);
    }
  };

  // Match Dimensions Tool (مساواة العرض أو الارتفاع)
  const matchDimensions = (dimension: 'width' | 'height') => {
    if (selectedFields.length < 2 || !primaryField) return;
    pushUndo(currentLayout);
    const targetVal = primaryField.rect[dimension];

    setCurrentLayout((prev) => {
      const list = prev[page] || [];
      return {
        ...prev,
        [page]: list.map((f) =>
          selectedFieldIds.includes(f.id)
            ? {
                ...f,
                rect: {
                  ...f.rect,
                  [dimension]: targetVal
                }
              }
            : f
        )
      };
    });
    setSaveToast(`تمت مساواة ${dimension === 'width' ? 'العرض' : 'الارتفاع'} لجميع الحقول المحددة`);
    setTimeout(() => setSaveToast(null), 1500);
  };

  // Preset Box Sizes for primary field
  const applyPresetSize = (preset: 'singleText' | 'textarea' | 'idCard' | 'checkbox' | 'signature') => {
    if (!primaryField) return;
    pushUndo(currentLayout);
    const r = { ...primaryField.rect };
    if (preset === 'singleText') {
      r.height = 3.45;
    } else if (preset === 'textarea') {
      r.height = 9.5;
    } else if (preset === 'idCard') {
      r.width = 36.5;
      r.height = 18.0;
    } else if (preset === 'checkbox') {
      r.width = 3.2;
      r.height = 2.2;
    } else if (preset === 'signature') {
      r.height = 6.0;
    }
    updateField(primaryField.id, { rect: r });
  };

  // Convert client coordinates to percentage inside the canvas
  const clientToCanvasPercent = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { xPct: 0, yPct: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const xPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, (y / rect.height) * 100));
    return { xPct, yPct };
  };

  // =========================================================================
  // GLOBAL PHOTOSHOP / FIGMA SHORTCUTS ENGINE
  // =========================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'SELECT' ||
        activeEl?.tagName === 'TEXTAREA';

      if (e.key === 'Alt') {
        setIsAltPressed(true);
      }

      // Spacebar Hand Tool (Photoshop classic: hold Space to Pan)
      if (e.code === 'Space' && !isTyping && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      // Tab key: Toggle Properties Panel (Photoshop classic Tab)
      if (e.key === 'Tab' && !isTyping) {
        e.preventDefault();
        setIsPanelCollapsed((prev) => !prev);
        return;
      }

      // Select All (Ctrl+A / Cmd+A)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A') && !isTyping) {
        e.preventDefault();
        setSelectedFieldIds(pageFields.map((f) => f.id));
        return;
      }

      // Single-key tool switches (when not typing)
      if (!isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'v') {
          setActiveTool('select');
          return;
        }
        if (key === 'h') {
          setActiveTool('hand');
          return;
        }
        if (key === 't') {
          setActiveTool('text');
          return;
        }
        if (key === 'd') {
          setActiveTool('dropdown');
          return;
        }
        if (key === 'm' || key === 'a') {
          setActiveTool('textarea');
          return;
        }
        if (key === 'i') {
          setActiveTool('image');
          return;
        }
        if (key === 'n') {
          setActiveTool('number');
          return;
        }
        if (key === 'c') {
          setActiveTool('checkbox');
          return;
        }
        if (key === '?' || (e.shiftKey && key === '/')) {
          setShowShortcutsModal((prev) => !prev);
          return;
        }
        if (key === '[') {
          setPage((p) => Math.max(1, p - 1));
          return;
        }
        if (key === ']') {
          setPage((p) => Math.min(6, p + 1));
          return;
        }
      }

      // Undo / Redo (Ctrl+Z / Ctrl+Y / Cmd+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          return;
        }
        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
          return;
        }
        // Copy (Ctrl+C)
        if (e.key === 'c' || e.key === 'C') {
          if (!isTyping && selectedFields.length > 0) {
            e.preventDefault();
            handleCopy();
            return;
          }
        }
        // Paste (Ctrl+V)
        if (e.key === 'v' || e.key === 'V') {
          if (!isTyping && clipboardFields.length > 0) {
            e.preventDefault();
            handlePaste();
            return;
          }
        }
        // Duplicate (Ctrl+D or Ctrl+J like Photoshop)
        if (e.key === 'd' || e.key === 'D' || e.key === 'j' || e.key === 'J') {
          if (!isTyping && selectedFields.length > 0) {
            e.preventDefault();
            duplicateSelectedFields();
            return;
          }
        }
        // Zoom In (Ctrl + + or =)
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setScale((s) => Math.min(2.2, +(s + 0.1).toFixed(2)));
          return;
        }
        // Zoom Out (Ctrl + -)
        if (e.key === '-') {
          e.preventDefault();
          setScale((s) => Math.max(0.4, +(s - 0.1).toFixed(2)));
          return;
        }
        // Reset Zoom (Ctrl + 0)
        if (e.key === '0') {
          e.preventDefault();
          setScale(0.95);
          return;
        }
      }

      // Escape: Deselect / Close Modals
      if (e.key === 'Escape') {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
        if (showBulkOptionsModal) {
          setShowBulkOptionsModal(false);
          return;
        }
        if (showJsonModal) {
          setShowJsonModal(false);
          return;
        }
        if (contextMenu) {
          setContextMenu(null);
          return;
        }
        setSelectedFieldIds([]);
        setActiveTool('select');
        return;
      }

      // Arrow Keys Nudging for all selected fields (0.1% normal, 1.0% with Shift, Resize with Alt)
      if (selectedFields.length > 0 && !isTyping) {
        const step = e.shiftKey ? 1.0 : 0.1;

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          pushUndo(currentLayout);

          setCurrentLayout((prev) => {
            const list = prev[page] || [];
            return {
              ...prev,
              [page]: list.map((f) => {
                if (!selectedFieldIds.includes(f.id)) return f;
                const r = { ...f.rect };
                if (e.key === 'ArrowUp') {
                  if (e.altKey) r.height = Math.max(0.5, +(r.height - step).toFixed(2));
                  else r.top = Math.max(0, +(r.top - step).toFixed(2));
                } else if (e.key === 'ArrowDown') {
                  if (e.altKey) r.height = Math.min(100 - r.top, +(r.height + step).toFixed(2));
                  else r.top = Math.min(100 - r.height, +(r.top + step).toFixed(2));
                } else if (e.key === 'ArrowLeft') {
                  if (e.altKey) r.width = Math.max(0.5, +(r.width - step).toFixed(2));
                  else r.left = Math.max(0, +(r.left - step).toFixed(2));
                } else if (e.key === 'ArrowRight') {
                  if (e.altKey) r.width = Math.min(100 - r.left, +(r.width + step).toFixed(2));
                  else r.left = Math.min(100 - r.width, +(r.left + step).toFixed(2));
                }
                return { ...f, rect: r };
              })
            };
          });
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deleteSelectedFields();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltPressed(false);
      }
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    selectedFields,
    selectedFieldIds,
    pageFields,
    clipboardFields,
    showShortcutsModal,
    showJsonModal,
    contextMenu,
    isSpacePressed,
    currentLayout,
    page,
    pushUndo,
    deleteSelectedFields,
    duplicateSelectedFields,
    handleCopy,
    handlePaste,
    handleUndo,
    handleRedo
  ]);

  // Handle Mouse Down on Canvas (Start drawing or start panning or deselect)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (contextMenu) setContextMenu(null);
    if (e.button !== 0) return;

    // Pan canvas if spacebar held or Hand tool active
    if (isSpacePressed || activeTool === 'hand') {
      setIsPanning(true);
      if (viewportRef.current) {
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: viewportRef.current.scrollLeft,
          scrollTop: viewportRef.current.scrollTop
        };
      }
      return;
    }

    if (activeTool === 'select') {
      if (!e.shiftKey) {
        setSelectedFieldIds([]);
      }
      return;
    }

    const { xPct, yPct } = clientToCanvasPercent(e.clientX, e.clientY);
    setDragState({
      isDragging: true,
      handle: null,
      startX: xPct,
      startY: yPct,
      originalRect: null,
      originalRects: {},
      currentDrawingRect: { left: xPct, top: yPct, width: 0, height: 0 }
    });
  };

  // Handle Mouse Down on Field (Move, Resize, Alt+Drag Clone, Shift Multi-select)
  const handleFieldMouseDown = (
    e: React.MouseEvent,
    field: FieldConfig,
    handle: ResizeHandle = 'move'
  ) => {
    if (contextMenu) setContextMenu(null);
    e.stopPropagation();

    // If spacebar is held, allow canvas pan
    if (isSpacePressed || activeTool === 'hand') {
      setIsPanning(true);
      if (viewportRef.current) {
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: viewportRef.current.scrollLeft,
          scrollTop: viewportRef.current.scrollTop
        };
      }
      return;
    }

    if (e.button !== 0) return;

    // Selection handling
    let currentSelection = [...selectedFieldIds];
    if (handle === 'move') {
      if (e.shiftKey) {
        // Toggle selection
        if (currentSelection.includes(field.id)) {
          currentSelection = currentSelection.filter((id) => id !== field.id);
        } else {
          currentSelection.push(field.id);
        }
      } else {
        // If clicking an unselected field without Shift, make it the sole selection
        if (!currentSelection.includes(field.id)) {
          currentSelection = [field.id];
        }
      }
    } else {
      // Resizing handle belongs to this field
      currentSelection = [field.id];
    }
    setSelectedFieldIds(currentSelection);

    // Alt+Drag: Clone selected fields instantly (Figma / Illustrator)
    if (e.altKey && handle === 'move') {
      duplicateSelectedFields({ x: 0, y: 0 });
      return;
    }

    const { xPct, yPct } = clientToCanvasPercent(e.clientX, e.clientY);

    pushUndo(currentLayout);

    // Capture initial rects for all selected fields
    const origRects: { [id: string]: FieldRect } = {};
    pageFields.forEach((f) => {
      if (currentSelection.includes(f.id)) {
        origRects[f.id] = { ...f.rect };
      }
    });

    setDragState({
      isDragging: true,
      handle: handle,
      startX: xPct,
      startY: yPct,
      originalRect: { ...field.rect },
      originalRects: origRects,
      currentDrawingRect: null
    });
  };

  // Right-Click Context Menu on Field
  const handleFieldContextMenu = (e: React.MouseEvent, field: FieldConfig) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedFieldIds.includes(field.id)) {
      setSelectedFieldIds([field.id]);
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      fieldId: field.id
    });
  };

  // Handle Global Mouse Move (Option Symmetrical Expand, Multi-Move, Snapping)
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      // 1. Spacebar or Hand tool canvas panning
      if (isPanning && viewportRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        viewportRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
        viewportRef.current.scrollTop = panStartRef.current.scrollTop - dy;
        return;
      }

      // Track cursor position in percentage
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          const x = +(((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
          const y = +(((e.clientY - rect.top) / rect.height) * 100).toFixed(1);
          setCursorPos({ x, y });
        }
      }

      if (!dragState.isDragging) return;

      const { xPct, yPct } = clientToCanvasPercent(e.clientX, e.clientY);
      const deltaX = xPct - dragState.startX;
      const deltaY = yPct - dragState.startY;

      // 2. Drawing a new field
      if (activeTool !== 'select' && dragState.currentDrawingRect) {
        const left = Math.min(dragState.startX, xPct);
        const top = Math.min(dragState.startY, yPct);
        const width = Math.abs(xPct - dragState.startX);
        const height = Math.abs(yPct - dragState.startY);
        setDragState((prev) => ({
          ...prev,
          currentDrawingRect: { left, top, width, height }
        }));
        return;
      }

      // 3. Moving one or multiple selected fields simultaneously with Smart Snapping
      if (dragState.handle === 'move' && Object.keys(dragState.originalRects).length > 0) {
        let snappedDeltaX = deltaX;
        let snappedDeltaY = deltaY;

        let snapX: number | undefined = undefined;
        let snapY: number | undefined = undefined;

        // Smart Snapping based on primary dragged field
        if (primaryField && dragState.originalRect) {
          const orig = dragState.originalRect;
          const proposedLeft = orig.left + deltaX;
          const proposedTop = orig.top + deltaY;

          for (const other of pageFields) {
            if (selectedFieldIds.includes(other.id)) continue;
            // Snap Left edge
            if (Math.abs(proposedLeft - other.rect.left) < 0.45) {
              snappedDeltaX = other.rect.left - orig.left;
              snapX = other.rect.left;
            }
            // Snap Right edge
            else if (Math.abs(proposedLeft + orig.width - (other.rect.left + other.rect.width)) < 0.45) {
              snappedDeltaX = other.rect.left + other.rect.width - orig.width - orig.left;
              snapX = other.rect.left + other.rect.width;
            }
            // Snap Top edge
            if (Math.abs(proposedTop - other.rect.top) < 0.35) {
              snappedDeltaY = other.rect.top - orig.top;
              snapY = other.rect.top;
            }
          }
        }

        setSnapGuides({ x: snapX, y: snapY });

        // Apply new positions to all currently selected fields
        setCurrentLayout((prev) => {
          const list = prev[page] || [];
          return {
            ...prev,
            [page]: list.map((f) => {
              const orig = dragState.originalRects[f.id];
              if (!orig) return f;
              const newLeft = Math.max(0, Math.min(100 - orig.width, +(orig.left + snappedDeltaX).toFixed(2)));
              const newTop = Math.max(0, Math.min(100 - orig.height, +(orig.top + snappedDeltaY).toFixed(2)));
              return { ...f, rect: { ...orig, left: newLeft, top: newTop } };
            })
          };
        });
        return;
      }

      // 4. Resizing an existing field with Option (Alt) Symmetrical Expand from Center (Figma Style)
      if (primaryField && dragState.originalRect && dragState.handle && dragState.handle !== 'move') {
        const orig = dragState.originalRect;
        const h = dragState.handle;
        const isAlt = e.altKey; // Option / Alt key held!
        const isShift = e.shiftKey; // Shift key held for aspect ratio

        if (isAlt) {
          // ===============================================================
          // FIGMA / PHOTOSHOP SYMMETRICAL EXPANSION FROM CENTER
          // ===============================================================
          const centerX = orig.left + orig.width / 2;
          const centerY = orig.top + orig.height / 2;
          let newWidth = orig.width;
          let newHeight = orig.height;

          if (h === 'e') {
            newWidth = Math.max(1, orig.width + 2 * deltaX);
          } else if (h === 'w') {
            newWidth = Math.max(1, orig.width - 2 * deltaX);
          } else if (h === 's') {
            newHeight = Math.max(0.5, orig.height + 2 * deltaY);
          } else if (h === 'n') {
            newHeight = Math.max(0.5, orig.height - 2 * deltaY);
          } else if (h === 'se') {
            newWidth = Math.max(1, orig.width + 2 * deltaX);
            newHeight = Math.max(0.5, orig.height + 2 * deltaY);
            if (isShift) {
              const aspect = orig.width / orig.height;
              newHeight = newWidth / aspect;
            }
          } else if (h === 'nw') {
            newWidth = Math.max(1, orig.width - 2 * deltaX);
            newHeight = Math.max(0.5, orig.height - 2 * deltaY);
            if (isShift) {
              const aspect = orig.width / orig.height;
              newHeight = newWidth / aspect;
            }
          } else if (h === 'ne') {
            newWidth = Math.max(1, orig.width + 2 * deltaX);
            newHeight = Math.max(0.5, orig.height - 2 * deltaY);
            if (isShift) {
              const aspect = orig.width / orig.height;
              newHeight = newWidth / aspect;
            }
          } else if (h === 'sw') {
            newWidth = Math.max(1, orig.width - 2 * deltaX);
            newHeight = Math.max(0.5, orig.height + 2 * deltaY);
            if (isShift) {
              const aspect = orig.width / orig.height;
              newHeight = newWidth / aspect;
            }
          }

          let newLeft = centerX - newWidth / 2;
          let newTop = centerY - newHeight / 2;

          // Clamping to canvas boundaries
          if (newLeft < 0) {
            newWidth += newLeft * 2;
            newLeft = 0;
          }
          if (newLeft + newWidth > 100) {
            newWidth = (100 - centerX) * 2;
            newLeft = centerX - newWidth / 2;
          }
          if (newTop < 0) {
            newHeight += newTop * 2;
            newTop = 0;
          }
          if (newTop + newHeight > 100) {
            newHeight = (100 - centerY) * 2;
            newTop = centerY - newHeight / 2;
          }

          updateField(primaryField.id, {
            rect: {
              left: +newLeft.toFixed(2),
              top: +newTop.toFixed(2),
              width: +newWidth.toFixed(2),
              height: +newHeight.toFixed(2)
            }
          });
        } else {
          // Standard one-directional resize
          let left = orig.left;
          let top = orig.top;
          let width = orig.width;
          let height = orig.height;

          if (h.includes('e')) {
            width = Math.max(1, Math.min(100 - left, +(orig.width + deltaX).toFixed(2)));
          }
          if (h.includes('w')) {
            const maxLeftShift = orig.left + orig.width - 1;
            const proposedLeft = Math.max(0, Math.min(maxLeftShift, +(orig.left + deltaX).toFixed(2)));
            width = +(orig.width + (orig.left - proposedLeft)).toFixed(2);
            left = proposedLeft;
          }
          if (h.includes('s')) {
            height = Math.max(0.8, Math.min(100 - top, +(orig.height + deltaY).toFixed(2)));
          }
          if (h.includes('n')) {
            const maxTopShift = orig.top + orig.height - 0.8;
            const proposedTop = Math.max(0, Math.min(maxTopShift, +(orig.top + deltaY).toFixed(2)));
            height = +(orig.height + (orig.top - proposedTop)).toFixed(2);
            top = proposedTop;
          }

          updateField(primaryField.id, {
            rect: { left, top, width, height }
          });
        }
      }
    },
    [dragState, activeTool, primaryField, selectedFieldIds, isPanning, pageFields, page, updateField]
  );

  // Handle Global Mouse Up
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setSnapGuides({});

    if (!dragState.isDragging) return;

    if (activeTool !== 'select' && dragState.currentDrawingRect) {
      const rect = dragState.currentDrawingRect;
      if (rect.width > 1.2 && rect.height > 0.8) {
        const fieldType: FieldType =
          activeTool === 'dropdown' ? 'select' : (activeTool as FieldType);

        pushUndo(currentLayout);

        const newField: FieldConfig = {
          id: `p${page}_${fieldType}_${Date.now().toString().slice(-4)}`,
          page: page,
          type: fieldType,
          label:
            fieldType === 'image'
              ? 'صورة / بطاقة'
              : fieldType === 'textarea'
              ? 'ملاحظات / وصف'
              : fieldType === 'select'
              ? 'قائمة اختيار'
              : fieldType === 'checkbox'
              ? 'مربع اختيار'
              : 'حقل جديد',
          binding: `custom.${fieldType}_${Date.now().toString().slice(-4)}`,
          placeholder: fieldType === 'select' ? '-- اختر --' : 'اكتب هنا...',
          options: fieldType === 'select' ? ['نعم', 'لا'] : undefined,
          rect: {
            left: +rect.left.toFixed(2),
            top: +rect.top.toFixed(2),
            width: +rect.width.toFixed(2),
            height: +rect.height.toFixed(2)
          },
          style: {
            textAlign: fieldType === 'select' ? 'center' : 'right',
            fontSize: 'auto'
          }
        };

        setCurrentLayout((prev) => ({
          ...prev,
          [page]: [...(prev[page] || []), newField]
        }));
        setSelectedFieldIds([newField.id]);
        setActiveTool('select');
      }
    }

    setDragState({
      isDragging: false,
      handle: null,
      startX: 0,
      startY: 0,
      originalRect: null,
      originalRects: {},
      currentDrawingRect: null
    });
  }, [dragState, activeTool, page, pushUndo, currentLayout]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Master Save to Project File
  const handleSaveToProjectFile = async () => {
    const jsonStr = JSON.stringify(currentLayout, null, 2);
    let savedToDisk = false;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const res = await invoke<string>('save_layout_file', { jsonContent: jsonStr });
      if (res) savedToDisk = true;
    } catch (e) {
      console.warn('Tauri invoke not available or browser mode, triggering download:', e);
    }

    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document_layout.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }

    onSaveLayout(currentLayout);
    setSaveToast(
      savedToDisk
        ? 'تم حفظ وتحديث ملف document_layout.json في المشروع بنجاح!'
        : 'تم حفظ التعديلات وتنزيل ملف document_layout.json!'
    );
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (window.confirm('هل تريد استعادة جميع الحقول الافتراضية المكتشفة للصفحة الحالية؟')) {
      pushUndo(currentLayout);
      setCurrentLayout((prev) => ({
        ...prev,
        [page]: DEFAULT_DOCUMENT_LAYOUT[page] || []
      }));
      setSelectedFieldIds([]);
    }
  };

  // Make all fields on current page auto font-size
  const handleSetCurrentPageFontsAuto = () => {
    pushUndo(currentLayout);
    setCurrentLayout((prev) => {
      const pageFields = prev[page] || [];
      const updated = pageFields.map((f) => ({
        ...f,
        style: {
          ...f.style,
          fontSize: 'auto' as const
        }
      }));
      const newLayout = {
        ...prev,
        [page]: updated
      };
      onSaveLayout(newLayout);
      return newLayout;
    });
    setSaveToast(`تم ضبط خطوط جميع حقول الصفحة ${page} تلقائياً (Auto) بنجاح!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Export JSON modal
  const handleExportJson = () => {
    navigator.clipboard.writeText(JSON.stringify(currentLayout, null, 2));
    setShowJsonModal(true);
  };

  // Parse bulk options from comma or newline separated text
  const parseBulkOptions = (text: string): string[] => {
    return text
      .split(/[\n\r,،]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  // Add Option to primary field dropdown (supports single or auto-detected bulk)
  const handleAddOption = (inputVal?: string) => {
    if (!primaryField) return;
    const raw = (inputVal !== undefined ? inputVal : newOptionInput).trim();
    if (!raw) return;

    // Auto-detect bulk data if user pasted commas or newlines
    if (raw.includes(',') || raw.includes('،') || raw.includes('\n')) {
      const items = parseBulkOptions(raw);
      const currentOpts = primaryField.options || [];
      const combined = Array.from(new Set([...currentOpts, ...items]));
      updateField(primaryField.id, { options: combined }, true);
      setSaveToast(`تمت إضافة ${items.length} خيار بنجاح!`);
      setTimeout(() => setSaveToast(null), 2500);
    } else {
      const currentOpts = primaryField.options || [];
      if (!currentOpts.includes(raw)) {
        updateField(primaryField.id, { options: [...currentOpts, raw] }, true);
      }
    }
    setNewOptionInput('');
  };

  // Apply Bulk Options from Modal
  const handleApplyBulkOptions = (replace: boolean) => {
    if (!primaryField || !bulkInputText.trim()) return;
    const items = parseBulkOptions(bulkInputText);
    if (items.length === 0) return;

    const unique = Array.from(new Set(items));
    const finalOptions = replace
      ? unique
      : Array.from(new Set([...(primaryField.options || []), ...unique]));

    updateField(primaryField.id, { options: finalOptions }, true);
    setShowBulkOptionsModal(false);
    setBulkInputText('');
    setSaveToast(`تم ${replace ? 'استبدال' : 'إلحاق'} ${unique.length} خيار بنجاح!`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Clear all options
  const handleClearAllOptions = () => {
    if (!primaryField) return;
    if (window.confirm('هل أنت متأكد من حذف كافة خيارات القائمة المنسدلة؟')) {
      updateField(primaryField.id, { options: [] }, true);
    }
  };

  // Remove Option from primary field dropdown
  const handleRemoveOption = (optToRemove: string) => {
    if (!primaryField) return;
    const currentOpts = primaryField.options || [];
    updateField(
      primaryField.id,
      { options: currentOpts.filter((o) => o !== optToRemove) },
      true
    );
  };

  return (
    <div
      dir="ltr"
      className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 select-none font-['IBM_Plex_Sans_Arabic'] overflow-hidden"
    >
      {/* ========================================================================= */}
      {/* TOP STUDIO TOOLBAR (Photoshop / Figma inspired)                           */}
      {/* ========================================================================= */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-30 shrink-0 shadow-md">
        {/* Left: Home Navigation & Tools Palette */}
        <div className="flex items-center gap-2">
          {/* Home Button: Return to Main Form */}
          <button
            type="button"
            onClick={onCloseStudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 hover:border-amber-500/50 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            title="العودة إلى الصفحة الرئيسية والاستمارة (Home)"
          >
            <Home className="w-4 h-4 text-amber-400" />
            <span>الرئيسية (Home)</span>
          </button>

          <div className="w-[1px] h-5 bg-slate-800 mx-0.5" />

          {/* Toggle Left Sidebar Button */}
          <button
            onClick={() => setIsPanelCollapsed((prev) => !prev)}
            className={`p-2 rounded-lg border transition-colors ${
              !isPanelCollapsed
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="إخفاء/إظهار لوحة الخصائص (Tab)"
          >
            {!isPanelCollapsed ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          {/* Tool Palette with Hotkeys */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/80 shadow-inner">
            <button
              onClick={() => setActiveTool('select')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                activeTool === 'select'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : 'text-slate-300 hover:bg-slate-700/60'
              }`}
              title="تحديد وتحريك (V)"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>تحديد (V)</span>
            </button>

            <button
              onClick={() => setActiveTool('hand')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                activeTool === 'hand' || isSpacePressed
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : 'text-slate-300 hover:bg-slate-700/60'
              }`}
              title="أداة اليد / تحريك لوحة العمل (H أو مسافة)"
            >
              <Hand className="w-3.5 h-3.5" />
              <span>يد (H)</span>
            </button>

            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

            <button
              onClick={() => setActiveTool('text')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                activeTool === 'text'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : 'text-slate-300 hover:bg-slate-700/60'
              }`}
              title="حقل نص سطر واحد (T)"
            >
              <Type className="w-3.5 h-3.5" />
              <span>نص (T)</span>
            </button>

            <button
              onClick={() => setActiveTool('dropdown')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                activeTool === 'dropdown'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : 'text-slate-300 hover:bg-slate-700/60'
              }`}
              title="قائمة منسدلة خيارات (D)"
            >
              <ListFilter className="w-3.5 h-3.5 text-cyan-400" />
              <span>قائمة (D)</span>
            </button>

            <button
              onClick={() => setActiveTool('textarea')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                activeTool === 'textarea'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : 'text-slate-300 hover:bg-slate-700/60'
              }`}
              title="ملاحظات متعدد الأسطر (M)"
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>ملاحظات (M)</span>
            </button>

            <button
              onClick={() => setActiveTool('image')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                activeTool === 'image'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : 'text-slate-300 hover:bg-slate-700/60'
              }`}
              title="مربع صورة أو بطاقة رقم قومي (I)"
            >
              <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
              <span>صورة (I)</span>
            </button>

            <button
              onClick={() => setActiveTool('number')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                activeTool === 'number'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : 'text-slate-300 hover:bg-slate-700/60'
              }`}
              title="رقم أو رقم قومي (N)"
            >
              <Hash className="w-3.5 h-3.5 text-emerald-400" />
              <span>رقم (N)</span>
            </button>

            <button
              onClick={() => setActiveTool('checkbox')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                activeTool === 'checkbox'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : 'text-slate-300 hover:bg-slate-700/60'
              }`}
              title="مربع اختيار (C)"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>اختيار (C)</span>
            </button>
          </div>

          {/* Undo / Redo buttons */}
          <div className="flex items-center gap-0.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/80">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-30 transition-colors text-slate-300"
              title="تراجع Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-30 transition-colors text-slate-300"
              title="إعادة Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Page Switcher & Zoom */}
        <div className="flex items-center gap-3">
          {/* Page Switcher */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 transition-colors"
              title="الصفحة السابقة ([)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-amber-400 px-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              صفحة {page} من 6
            </span>
            <button
              onClick={() => setPage((p) => Math.min(6, p + 1))}
              disabled={page >= 6}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 transition-colors"
              title="الصفحة التالية (])"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setScale((s) => Math.max(0.4, +(s - 0.1).toFixed(2)))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="تصغير (Ctrl + -)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-bold text-amber-300 px-1">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2.2, +(s + 0.1).toFixed(2)))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="تكبير (Ctrl + +)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScale(0.95)}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
              title="المقاس الافتراضي (Ctrl + 0)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Actions & Save */}
        <div className="flex items-center gap-2">
          {/* Keyboard Shortcuts Button */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            title="دليل اختصارات الفوتوشوب وفيجما (?)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>الاختصارات (?)</span>
          </button>

          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            title="استعادة الإحداثيات الافتراضية المكتشفة"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>استعادة الافتراضي</span>
          </button>

          <button
            onClick={handleSetCurrentPageFontsAuto}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 text-xs font-medium border border-indigo-800 transition-colors"
            title="جعل حجم الخط تلقائي (auto) لجميع حقول هذه الصفحة"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>خط تلقائي للصفحة (auto)</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            title="تصدير كود JSON"
          >
            <FileCode className="w-3.5 h-3.5 text-sky-400" />
            <span>كود JSON</span>
          </button>

          {/* Master Save Button for User & AI Collaboration */}
          <button
            onClick={handleSaveToProjectFile}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
            title="حفظ ملف document_layout.json مباشرة في المشروع وتنزيل نسخة احتياطية"
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ لملف المشروع (document_layout.json)</span>
          </button>

          <button
            onClick={onCloseStudio}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
            title="تطبيق التعديلات والعودة للاستمارة الرئيسية"
          >
            <Home className="w-3.5 h-3.5" />
            <span>العودة للاستمارة الرئيسية</span>
          </button>
        </div>
      </header>

      {/* Save Notification Toast */}
      {saveToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-emerald-400 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4" />
          {saveToast}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN STUDIO WORKSPACE (LEFT STICKY INSPECTOR + RIGHT CANVAS)              */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* ======================================================================= */}
        {/* LEFT HAND SIDE STICKY PROPERTIES PANEL                                  */}
        {/* ======================================================================= */}
        {!isPanelCollapsed && (
          <aside
            dir="rtl"
            className="w-[340px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20 shadow-2xl overflow-y-auto font-['IBM_Plex_Sans_Arabic']"
          >
            {/* Header */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10 backdrop-blur">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200">
                  لوحة الخصائص والإحداثيات
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedFields.length > 1 ? (
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded font-bold">
                    {selectedFields.length} حقول محددة
                  </span>
                ) : primaryField ? (
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono truncate max-w-[120px]">
                    {primaryField.id}
                  </span>
                ) : null}
                <button
                  onClick={() => setIsPanelCollapsed(true)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                  title="طي اللوحة (Tab)"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* =================================================================== */}
            {/* POSITIONING, ALIGNMENT & SPACING SUITE (FIGMA STYLE)                */}
            {/* =================================================================== */}
            {selectedFields.length > 0 && (
              <div className="p-3 border-b border-slate-800 bg-slate-950/50 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
                  <span className="flex items-center gap-1">
                    <LayoutGrid className="w-3.5 h-3.5" />
                    {selectedFields.length > 1
                      ? 'محاذاة وتوسيط العناصر معاً (Figma Alignment)'
                      : 'المحاذاة والتوسيط في الصفحة'}
                  </span>
                  {selectedFields.length > 1 && (
                    <span className="text-[9px] text-sky-400 font-mono">Shift+Click لإضافة حقول</span>
                  )}
                </div>

                {/* 6-Way Alignment Grid (Left, CenterH, Right, Top, CenterV, Bottom) */}
                <div className="grid grid-cols-6 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => alignComponents('left')}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title={selectedFields.length > 1 ? 'محاذاة لليسار المشترك' : 'محاذاة لليمين / بداية الهامش'}
                  >
                    <AlignHorizontalJustifyStart className="w-4 h-4 rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => alignComponents('centerH')}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title={selectedFields.length > 1 ? 'توسيط أفقي مشترك للعناصر' : 'توسيط أفقي في منتصف الصفحة'}
                  >
                    <AlignHorizontalJustifyCenter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => alignComponents('right')}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title={selectedFields.length > 1 ? 'محاذاة لليمن المشترك' : 'محاذاة لليسار / نهاية الهامش'}
                  >
                    <AlignHorizontalJustifyEnd className="w-4 h-4 rotate-180" />
                  </button>

                  <button
                    type="button"
                    onClick={() => alignComponents('top')}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title={selectedFields.length > 1 ? 'محاذاة لأعلى المشترك' : 'محاذاة لأعلى الصفحة'}
                  >
                    <AlignVerticalJustifyStart className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => alignComponents('centerV')}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title={selectedFields.length > 1 ? 'توسيط رأسي مشترك للعناصر' : 'توسيط رأسي في منتصف الصفحة'}
                  >
                    <AlignVerticalJustifyCenter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => alignComponents('bottom')}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title={selectedFields.length > 1 ? 'محاذاة لأسفل المشترك' : 'محاذاة لأسفل الصفحة'}
                  >
                    <AlignVerticalJustifyEnd className="w-4 h-4" />
                  </button>
                </div>

                {/* Page Centering & Full Width Tools */}
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => alignComponents('pageCenterH')}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1 transition-colors"
                    title="توسيط المجموعة في منتصف الصفحة أفقياً"
                  >
                    <MoveHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    توسيط بالصفحة
                  </button>
                  <button
                    type="button"
                    onClick={() => alignComponents('pageCenterV')}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1 transition-colors"
                    title="توسيط المجموعة في منتصف الصفحة رأسياً"
                  >
                    <MoveVertical className="w-3.5 h-3.5 text-amber-400" />
                    توسيط رأسي
                  </button>
                  <button
                    type="button"
                    onClick={() => alignComponents('fullWidth')}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1 transition-colors"
                    title="تمديد لكامل عرض الصفحة (83%)"
                  >
                    <Move className="w-3.5 h-3.5 text-sky-400" />
                    كامل العرض
                  </button>
                </div>

                {/* Spacing & Distribution Tools (when 2+ fields selected) */}
                {selectedFields.length > 1 && (
                  <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold">
                      <span className="flex items-center gap-1">
                        <Equal className="w-3.5 h-3.5 text-teal-400" />
                        ضبط وتوزيع المسافات (Spacing Things):
                      </span>
                    </div>

                    {/* Auto Even Distribution buttons */}
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => distributeSpacing('vertical')}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1 transition-colors"
                        title="توزيع المسافات الرأسية بالتساوي بين الحقول"
                      >
                        <AlignVerticalDistributeCenter className="w-3.5 h-3.5 text-teal-400" />
                        توزيع رأسي متساوٍ
                      </button>
                      <button
                        type="button"
                        onClick={() => distributeSpacing('horizontal')}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1 transition-colors"
                        title="توزيع المسافات الأفقية بالتساوي بين الحقول"
                      >
                        <AlignHorizontalDistributeCenter className="w-3.5 h-3.5 text-teal-400" />
                        توزيع أفقي متساوٍ
                      </button>
                    </div>

                    {/* Numeric Gap Stepper & Pack */}
                    <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[10px]">
                      <div className="flex items-center gap-1 text-slate-400">
                        <span>المسافة:</span>
                        <input
                          type="number"
                          step="0.2"
                          min="0"
                          value={customGap}
                          onChange={(e) => setCustomGap(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono text-center text-[10px]"
                        />
                        <span>%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => applyFixedSpacing('vertical', customGap)}
                          className="px-2 py-1 rounded bg-teal-600/30 hover:bg-teal-600/50 border border-teal-500/40 text-teal-300 transition-colors font-medium"
                          title="رص العناصر رأسياً بمسافة محددة"
                        >
                          رص رأسي
                        </button>
                        <button
                          type="button"
                          onClick={() => applyFixedSpacing('horizontal', customGap)}
                          className="px-2 py-1 rounded bg-teal-600/30 hover:bg-teal-600/50 border border-teal-500/40 text-teal-300 transition-colors font-medium"
                          title="رص العناصر أفقياً بمسافة محددة"
                        >
                          رص أفقي
                        </button>
                      </div>
                    </div>

                    {/* Match Width & Height buttons */}
                    <div className="grid grid-cols-2 gap-1 text-[10px] pt-1 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => matchDimensions('width')}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1"
                        title="مساواة عرض جميع الحقول المحددة بالحقل النشط"
                      >
                        <StretchHorizontal className="w-3 h-3 text-sky-400" />
                        مساواة العرض
                      </button>
                      <button
                        type="button"
                        onClick={() => matchDimensions('height')}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1"
                        title="مساواة ارتفاع جميع الحقول المحددة بالحقل النشط"
                      >
                        <StretchVertical className="w-3 h-3 text-sky-400" />
                        مساواة الارتفاع
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =================================================================== */}
            {/* PRIMARY FIELD PROPERTIES                                            */}
            {/* =================================================================== */}
            {primaryField ? (
              <div className="p-3.5 space-y-3 text-xs">
                {/* Field Presets */}
                <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/60">
                  <label className="block text-[10px] text-slate-400 mb-1 font-medium">
                    مقاسات استمارة أخوة الرب القياسية:
                  </label>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => applyPresetSize('singleText')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-center"
                      title="سطر نص عادي (3.45% ارتفاع)"
                    >
                      سطر عادي
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetSize('textarea')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-center"
                      title="ملاحظات كبيرة (9.5% ارتفاع)"
                    >
                      ملاحظات كبيرة
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetSize('idCard')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-center"
                      title="بطاقة رقم قومي (36.5% × 18%)"
                    >
                      بطاقة رقم قومي
                    </button>
                  </div>
                </div>

                {/* Field Label */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium text-[11px]">اسم الحقل / العنوان:</label>
                  <input
                    type="text"
                    value={primaryField.label}
                    onChange={(e) => updateField(primaryField.id, { label: e.target.value }, true)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Data Binding Path */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium text-[11px]">
                    ربط البيانات (Data Binding):
                  </label>
                  <input
                    type="text"
                    value={primaryField.binding}
                    onChange={(e) => updateField(primaryField.id, { binding: e.target.value }, true)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-amber-300 font-mono text-[11px] focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    placeholder="e.g. page2.husband.name"
                  />
                </div>

                {/* Field Type */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium text-[11px]">نوع الحقل:</label>
                  <select
                    value={primaryField.type}
                    onChange={(e) =>
                      updateField(primaryField.id, { type: e.target.value as FieldType }, true)
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:ring-1 focus:ring-amber-500 focus:outline-none font-bold"
                  >
                    <option value="text">نص سطر واحد (Text)</option>
                    <option value="select">قائمة منسدلة (DropDown)</option>
                    <option value="textarea">ملاحظات / وصف (Textarea)</option>
                    <option value="number">رقم / رقم قومي (Number)</option>
                    <option value="image">صورة / بطاقة (Image Dropzone)</option>
                    <option value="date">تاريخ (Date)</option>
                    <option value="checkbox">مربع اختيار (Checkbox)</option>
                  </select>
                </div>

                {/* DropDown Options Interactive Editor */}
                {primaryField.type === 'select' && (
                  <div className="p-2.5 bg-cyan-950/30 border border-cyan-800/40 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-cyan-300 font-bold text-[11px] flex items-center gap-1">
                        <ListFilter className="w-3.5 h-3.5 text-cyan-400" />
                        خيارات القائمة المنسدلة:
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-cyan-300 font-mono bg-cyan-900/60 px-1.5 py-0.2 rounded border border-cyan-700/50">
                          {(primaryField.options || []).length} خيار
                        </span>
                        {(primaryField.options || []).length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllOptions}
                            className="text-[9px] text-rose-400 hover:text-rose-300 hover:underline px-1"
                            title="حذف جميع الخيارات"
                          >
                            تفريغ
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Search inside options if options count > 5 */}
                    {(primaryField.options || []).length > 5 && (
                      <div className="relative">
                        <Search className="w-3 h-3 absolute right-2 top-1.5 text-cyan-400/60" />
                        <input
                          type="text"
                          value={optionsSearchFilter}
                          onChange={(e) => setOptionsSearchFilter(e.target.value)}
                          placeholder="بحث وتصفية في الخيارات..."
                          className="w-full bg-slate-900/90 border border-cyan-800/50 rounded pr-6 pl-2 py-0.5 text-cyan-200 text-[10px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    )}

                    {/* Chips List */}
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1 bg-slate-950/50 rounded border border-cyan-900/50">
                      {(primaryField.options || ['نعم', 'لا'])
                        .filter((opt) =>
                          optionsSearchFilter
                            ? opt.toLowerCase().includes(optionsSearchFilter.toLowerCase())
                            : true
                        )
                        .map((opt, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 bg-cyan-900/70 border border-cyan-700/70 text-cyan-100 px-2 py-0.5 rounded text-[11px] hover:bg-cyan-800/80 transition-colors"
                          >
                            <span className="max-w-[200px] truncate" title={opt}>
                              {opt}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(opt)}
                              className="hover:text-rose-400 text-cyan-400 font-bold ml-0.5"
                              title="حذف هذا الخيار"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                    </div>

                    {/* Add Single / Auto-Bulk Option input */}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newOptionInput}
                        onChange={(e) => setNewOptionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddOption();
                          }
                        }}
                        placeholder="اكتب خياراً، أو الصق بيانات بفواصل (,) أو أسطر..."
                        className="flex-1 bg-slate-900 border border-cyan-700/60 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddOption()}
                        className="p-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white"
                        title="إضافة (Enter)"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bulk Add Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setBulkInputText('');
                        setShowBulkOptionsModal(true);
                      }}
                      className="w-full py-1.5 rounded bg-gradient-to-r from-cyan-800/80 to-teal-800/80 hover:from-cyan-700 hover:to-teal-700 border border-cyan-600/60 text-cyan-100 text-[11px] font-bold flex items-center justify-center gap-1.5 shadow transition-all active:scale-98"
                    >
                      <FileCode className="w-3.5 h-3.5 text-cyan-300" />
                      <span>📥 إضافة دفعة مجمعة (Bulk Data Import)</span>
                    </button>

                    {/* Quick Presets */}
                    <div className="pt-1.5 border-t border-cyan-800/40 space-y-1">
                      <span className="text-[9px] text-slate-400 block">قوالب جاهزة بنقرة واحدة:</span>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            updateField(primaryField.id, { options: EGYPTIAN_CHURCHES_PRESET }, true);
                            setSaveToast('تم تحميل قائمة كنائس الإيبارشية (34 كنيسة) بنجاح!');
                            setTimeout(() => setSaveToast(null), 2500);
                          }}
                          className="text-[9px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold transition-colors"
                          title="تحميل جميع كنائس الإيبارشية الـ 34 بنقرة واحدة"
                        >
                          ⛪ كنائس الإيبارشية (34)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField(primaryField.id, { options: ['نعم', 'لا'] }, true)}
                          className="text-[9px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-1.5 py-0.5 rounded"
                        >
                          نعم / لا
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              primaryField.id,
                              { options: ['تمليك', 'إيجار قديم', 'إيجار جديد', 'مشترك'] },
                              true
                            )
                          }
                          className="text-[9px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-1.5 py-0.5 rounded"
                        >
                          السكن (4)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              primaryField.id,
                              { options: ['متزوج', 'أعزب', 'أرمل', 'مطلق'] },
                              true
                            )
                          }
                          className="text-[9px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-1.5 py-0.5 rounded"
                        >
                          الحالة الاجتماعية (4)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Placeholder */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium text-[11px]">النص الإرشادي (Placeholder):</label>
                  <input
                    type="text"
                    value={primaryField.placeholder || ''}
                    onChange={(e) => updateField(primaryField.id, { placeholder: e.target.value }, true)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Exact Percentage Coordinates with Micro-Steppers */}
                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold border-b border-slate-700/60 pb-1">
                    <span className="flex items-center gap-1">
                      <Crosshair className="w-3 h-3" />
                      الإحداثيات الدقيقة (٪)
                    </span>
                    <span className="text-[9px] text-slate-400 font-normal">الأسهم للضبط الدقيق</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>يسار (Left %):</span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                primaryField.id,
                                {
                                  rect: {
                                    ...primaryField.rect,
                                    left: Math.max(0, +(primaryField.rect.left - 0.1).toFixed(2))
                                  }
                                },
                                true
                              )
                            }
                            className="p-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[9px]"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                primaryField.id,
                                {
                                  rect: {
                                    ...primaryField.rect,
                                    left: Math.min(100, +(primaryField.rect.left + 0.1).toFixed(2))
                                  }
                                },
                                true
                              )
                            }
                            className="p-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[9px]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        step="0.05"
                        value={primaryField.rect.left}
                        onChange={(e) =>
                          updateField(
                            primaryField.id,
                            {
                              rect: { ...primaryField.rect, left: parseFloat(e.target.value) || 0 }
                            },
                            true
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-center text-xs"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>أعلى (Top %):</span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                primaryField.id,
                                {
                                  rect: {
                                    ...primaryField.rect,
                                    top: Math.max(0, +(primaryField.rect.top - 0.1).toFixed(2))
                                  }
                                },
                                true
                              )
                            }
                            className="p-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[9px]"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                primaryField.id,
                                {
                                  rect: {
                                    ...primaryField.rect,
                                    top: Math.min(100, +(primaryField.rect.top + 0.1).toFixed(2))
                                  }
                                },
                                true
                              )
                            }
                            className="p-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[9px]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        step="0.05"
                        value={primaryField.rect.top}
                        onChange={(e) =>
                          updateField(
                            primaryField.id,
                            {
                              rect: { ...primaryField.rect, top: parseFloat(e.target.value) || 0 }
                            },
                            true
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-center text-xs"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>العرض (Width %):</span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                primaryField.id,
                                {
                                  rect: {
                                    ...primaryField.rect,
                                    width: Math.max(1, +(primaryField.rect.width - 0.1).toFixed(2))
                                  }
                                },
                                true
                              )
                            }
                            className="p-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[9px]"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                primaryField.id,
                                {
                                  rect: {
                                    ...primaryField.rect,
                                    width: Math.min(100, +(primaryField.rect.width + 0.1).toFixed(2))
                                  }
                                },
                                true
                              )
                            }
                            className="p-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[9px]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        step="0.05"
                        value={primaryField.rect.width}
                        onChange={(e) =>
                          updateField(
                            primaryField.id,
                            {
                              rect: { ...primaryField.rect, width: parseFloat(e.target.value) || 1 }
                            },
                            true
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-center text-xs"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>الارتفاع (Height %):</span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                primaryField.id,
                                {
                                  rect: {
                                    ...primaryField.rect,
                                    height: Math.max(0.5, +(primaryField.rect.height - 0.1).toFixed(2))
                                  }
                                },
                                true
                              )
                            }
                            className="p-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[9px]"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                primaryField.id,
                                {
                                  rect: {
                                    ...primaryField.rect,
                                    height: Math.min(100, +(primaryField.rect.height + 0.1).toFixed(2))
                                  }
                                },
                                true
                              )
                            }
                            className="p-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[9px]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        step="0.05"
                        value={primaryField.rect.height}
                        onChange={(e) =>
                          updateField(
                            primaryField.id,
                            {
                              rect: { ...primaryField.rect, height: parseFloat(e.target.value) || 1 }
                            },
                            true
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-center text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Text Alignment */}
                <div className="space-y-1.5">
                  <label className="block text-slate-400 font-medium text-[11px]">محاذاة النص:</label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          primaryField.id,
                          {
                            style: { ...primaryField.style, textAlign: 'right' }
                          },
                          true
                        )
                      }
                      className={`py-1 rounded text-center text-xs ${
                        primaryField.style?.textAlign === 'right' || !primaryField.style?.textAlign
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      يمين
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          primaryField.id,
                          {
                            style: { ...primaryField.style, textAlign: 'center' }
                          },
                          true
                        )
                      }
                      className={`py-1 rounded text-center text-xs ${
                        primaryField.style?.textAlign === 'center'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      وسط
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          primaryField.id,
                          {
                            style: { ...primaryField.style, textAlign: 'left' }
                          },
                          true
                        )
                      }
                      className={`py-1 rounded text-center text-xs ${
                        primaryField.style?.textAlign === 'left'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      يسار
                    </button>
                  </div>
                </div>

                {/* Auto Font Size with Adobe Acrobat Style */}
                <div className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold text-[11px] flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      حجم الخط (Auto Font Size):
                    </label>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                      {primaryField.style?.fontSize === 'auto' || !primaryField.style?.fontSize
                        ? '⚡ تلقائي Auto Fit'
                        : `${primaryField.style?.fontSize}px`}
                    </span>
                  </div>
                  <select
                    value={primaryField.style?.fontSize || 'auto'}
                    onChange={(e) => {
                      const val = e.target.value === 'auto' ? 'auto' : parseInt(e.target.value, 10);
                      updateField(
                        primaryField.id,
                        {
                          style: { ...primaryField.style, fontSize: val }
                        },
                        true
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white focus:ring-1 focus:ring-amber-500 focus:outline-none text-xs"
                  >
                    <option value="auto">⚡ تلقائي متكيف مع ارتفاع وعرض البوكس (Auto Fit)</option>
                    <option value="9">صغير جداً (9px)</option>
                    <option value="10">صغير (10px)</option>
                    <option value="11">عادي (11px)</option>
                    <option value="12">متوسط (12px)</option>
                    <option value="13">واضح (13px)</option>
                    <option value="14">كبير (14px)</option>
                    <option value="16">كبير جداً (16px)</option>
                  </select>
                  <p className="text-[9px] text-slate-400 leading-tight">
                    الوضع التلقائي يضبط الخط ليتناسب مع ارتفاع المربع ويصغّره تلقائياً عند زيادة طول النص.
                  </p>
                </div>

                {/* Actions: Duplicate, Copy & Delete */}
                <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => duplicateSelectedFields()}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                    title="تكرار الحقول المحددة (Ctrl+D)"
                  >
                    <Copy className="w-3 h-3" />
                    <span>تكرار (Ctrl+D)</span>
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedFields}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-medium transition-colors"
                    title="حذف الحقول المحددة (Del)"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 flex flex-col items-center justify-center">
                <MousePointer className="w-8 h-8 mb-2 opacity-40 text-amber-400" />
                <p className="font-bold text-slate-400 text-xs mb-1">لم يتم تحديد أي حقل</p>
                <p className="text-[11px] leading-relaxed">
                  انقر على أي حقل لتحريكه وتعديله، أو استخدم Shift+Click لتحديد عدة حقول معاً وتوسيطها وضبط تباعدها.
                </p>
              </div>
            )}

            {/* Layers & Field Search Panel (Photoshop / Figma Layers) */}
            <div className="p-3 border-t border-slate-800 mt-auto bg-slate-950/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  الطبقات والحقول ({pageFields.length})
                </span>
                {selectedFieldIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedFieldIds([])}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    إلغاء التحديد
                  </button>
                )}
              </div>

              {/* Search box */}
              <div className="relative mb-2">
                <Search className="w-3 h-3 absolute right-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  placeholder="بحث في حقول الصفحة..."
                  className="w-full bg-slate-900 border border-slate-800 rounded pl-2 pr-7 py-1 text-slate-300 text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {filteredFields.map((f) => {
                  const isSelected = selectedFieldIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={(e) => {
                        if (e.shiftKey) {
                          setSelectedFieldIds((prev) =>
                            prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                          );
                        } else {
                          setSelectedFieldIds([f.id]);
                        }
                      }}
                      className={`w-full text-right px-2 py-1 rounded text-[11px] truncate flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                          : 'hover:bg-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">
                        {isSelected && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                        {f.label}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 shrink-0">
                        {Math.round(f.rect.top)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        {/* Collapsed Rail Button */}
        {isPanelCollapsed && (
          <div className="bg-slate-900 border-r border-slate-800 w-10 flex flex-col items-center py-3 gap-3 shrink-0 z-20 shadow-md">
            <button
              onClick={() => setIsPanelCollapsed(false)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
              title="إظهار لوحة الخصائص (Tab)"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <div className="w-5 h-[1px] bg-slate-800" />
            <button
              onClick={() => setIsPanelCollapsed(false)}
              className="p-1.5 rounded text-slate-400 hover:text-white"
              title="طبقات المستند"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ======================================================================= */}
        {/* CENTER / RIGHT CANVAS VIEWPORT                                          */}
        {/* ======================================================================= */}
        <div
          ref={viewportRef}
          className={`flex-1 overflow-auto p-8 flex justify-center items-start bg-slate-950 relative ${
            isSpacePressed || activeTool === 'hand'
              ? isPanning
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : ''
          }`}
        >
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            className={`relative bg-white shadow-2xl select-none transition-transform origin-top ${
              isSpacePressed || activeTool === 'hand'
                ? isPanning
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : activeTool !== 'select'
                ? 'cursor-crosshair'
                : 'cursor-default'
            }`}
            style={{
              width: '820px',
              minHeight: '1160px',
              transform: `scale(${scale})`,
              marginBottom: `${(scale - 1) * 1160}px`
            }}
          >
            {/* Background Template Image */}
            <img
              src={getPageImage(page)}
              alt={`صفحة ${page}`}
              className="w-full h-auto block select-none pointer-events-none"
              draggable={false}
            />

            {/* Smart Snapping Alignment Guidelines */}
            {snapGuides.x !== undefined && (
              <div
                className="absolute top-0 bottom-0 w-[1px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] z-50 pointer-events-none"
                style={{ left: `${snapGuides.x}%` }}
              />
            )}
            {snapGuides.y !== undefined && (
              <div
                className="absolute left-0 right-0 h-[1px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] z-50 pointer-events-none"
                style={{ top: `${snapGuides.y}%` }}
              />
            )}

            {/* Render Existing Fields on This Page */}
            {pageFields.map((field) => {
              const isSelected = selectedFieldIds.includes(field.id);
              const isPrimary = field.id === primaryField?.id;

              return (
                <div
                  key={field.id}
                  onMouseDown={(e) => handleFieldMouseDown(e, field, 'move')}
                  onContextMenu={(e) => handleFieldContextMenu(e, field)}
                  className={`absolute group cursor-move transition-shadow ${
                    isSelected
                      ? 'ring-2 ring-amber-500 bg-amber-500/25 z-20 shadow-xl'
                      : field.type === 'select'
                      ? 'border border-cyan-400/80 bg-cyan-400/15 hover:bg-cyan-400/25 z-10'
                      : 'border border-sky-400/80 bg-sky-400/10 hover:bg-sky-400/20 hover:border-sky-500 z-10'
                  }`}
                  style={{
                    left: `${field.rect.left}%`,
                    top: `${field.rect.top}%`,
                    width: `${field.rect.width}%`,
                    height: `${field.rect.height}%`
                  }}
                >
                  {/* Field Label / Tag */}
                  <div className="absolute -top-4 right-0 bg-slate-900/90 text-amber-300 text-[9px] font-bold px-1 py-0.5 rounded shadow pointer-events-none flex items-center gap-1 max-w-[160px] truncate">
                    {field.type === 'image' && <ImageIcon className="w-2.5 h-2.5 text-rose-400" />}
                    {field.type === 'textarea' && <AlignLeft className="w-2.5 h-2.5 text-blue-400" />}
                    {field.type === 'number' && <Hash className="w-2.5 h-2.5 text-emerald-400" />}
                    {field.type === 'select' && <ListFilter className="w-2.5 h-2.5 text-cyan-400" />}
                    <span>{field.label}</span>
                    {selectedFields.length > 1 && isSelected && (
                      <span className="text-[8px] bg-sky-600 text-white px-1 rounded">
                        ✓
                      </span>
                    )}
                  </div>

                  {/* Floating HUD Coordinate Tag during Move/Resize */}
                  {isPrimary && dragState.isDragging && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-amber-500 text-amber-300 text-[9px] font-mono px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none flex items-center gap-1.5">
                      <span>X: {field.rect.left}% | Y: {field.rect.top}% | W: {field.rect.width}% | H: {field.rect.height}%</span>
                      {isAltPressed && (
                        <span className="text-[8px] bg-amber-500 text-slate-950 px-1 py-0.2 rounded font-bold">
                          ⌥ تمدد متناظر
                        </span>
                      )}
                    </div>
                  )}

                  {/* Visual indication inside box */}
                  <div className="w-full h-full flex items-center justify-center p-1 overflow-hidden pointer-events-none">
                    <span className="text-[10px] text-slate-800 font-bold truncate opacity-75">
                      {field.type === 'select'
                        ? `▾ [${(field.options || ['نعم', 'لا']).join(' | ')}]`
                        : field.placeholder || field.binding}
                    </span>
                  </div>

                  {/* 8 Resize Handles (Visible only on the primary active field) */}
                  {isPrimary && (
                    <>
                      {/* NW */}
                      <div
                        onMouseDown={(e) => handleFieldMouseDown(e, field, 'nw')}
                        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-amber-500 border border-white rounded-sm cursor-nwse-resize z-30 shadow"
                        title="سحب (اضغط Alt للتمدد المتناظر من المركز)"
                      />
                      {/* N */}
                      <div
                        onMouseDown={(e) => handleFieldMouseDown(e, field, 'n')}
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-500 border border-white rounded-sm cursor-ns-resize z-30 shadow"
                        title="سحب (اضغط Alt للتمدد المتناظر من المركز)"
                      />
                      {/* NE */}
                      <div
                        onMouseDown={(e) => handleFieldMouseDown(e, field, 'ne')}
                        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-500 border border-white rounded-sm cursor-nesw-resize z-30 shadow"
                        title="سحب (اضغط Alt للتمدد المتناظر من المركز)"
                      />
                      {/* E */}
                      <div
                        onMouseDown={(e) => handleFieldMouseDown(e, field, 'e')}
                        className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-amber-500 border border-white rounded-sm cursor-ew-resize z-30 shadow"
                        title="سحب (اضغط Alt للتمدد المتناظر من المركز)"
                      />
                      {/* SE */}
                      <div
                        onMouseDown={(e) => handleFieldMouseDown(e, field, 'se')}
                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-amber-500 border border-white rounded-sm cursor-nwse-resize z-30 shadow"
                        title="سحب (اضغط Alt للتمدد المتناظر من المركز)"
                      />
                      {/* S */}
                      <div
                        onMouseDown={(e) => handleFieldMouseDown(e, field, 's')}
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-500 border border-white rounded-sm cursor-ns-resize z-30 shadow"
                        title="سحب (اضغط Alt للتمدد المتناظر من المركز)"
                      />
                      {/* SW */}
                      <div
                        onMouseDown={(e) => handleFieldMouseDown(e, field, 'sw')}
                        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-amber-500 border border-white rounded-sm cursor-nesw-resize z-30 shadow"
                        title="سحب (اضغط Alt للتمدد المتناظر من المركز)"
                      />
                      {/* W */}
                      <div
                        onMouseDown={(e) => handleFieldMouseDown(e, field, 'w')}
                        className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-amber-500 border border-white rounded-sm cursor-ew-resize z-30 shadow"
                        title="سحب (اضغط Alt للتمدد المتناظر من المركز)"
                      />
                    </>
                  )}
                </div>
              );
            })}

            {/* Currently Drawing Box Preview */}
            {dragState.isDragging && dragState.currentDrawingRect && (
              <div
                className="absolute border-2 border-dashed border-amber-500 bg-amber-500/25 z-40 pointer-events-none"
                style={{
                  left: `${dragState.currentDrawingRect.left}%`,
                  top: `${dragState.currentDrawingRect.top}%`,
                  width: `${dragState.currentDrawingRect.width}%`,
                  height: `${dragState.currentDrawingRect.height}%`
                }}
              >
                <div className="absolute -top-5 right-0 bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 rounded">
                  جاري الرسم...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM STATUS BAR (Photoshop / Figma HUD)                                 */}
      {/* ========================================================================= */}
      <footer className="h-8 bg-slate-900/90 border-t border-slate-800 px-4 flex items-center justify-between text-[11px] text-slate-400 z-30 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-amber-400 font-mono">
            <Crosshair className="w-3.5 h-3.5" />
            {cursorPos ? `X: ${cursorPos.x}% | Y: ${cursorPos.y}%` : 'X: -- | Y: --'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 text-slate-300">
            <span>الأداة النشطة:</span>
            <span className="bg-slate-800 text-amber-300 px-1.5 py-0.2 rounded font-bold">
              {activeTool === 'select'
                ? 'تحديد (V)'
                : activeTool === 'hand'
                ? 'يد (H)'
                : activeTool === 'text'
                ? 'نص (T)'
                : activeTool === 'dropdown'
                ? 'قائمة (D)'
                : activeTool === 'textarea'
                ? 'ملاحظات (M)'
                : activeTool === 'image'
                ? 'صورة (I)'
                : activeTool === 'number'
                ? 'رقم (N)'
                : 'اختيار (C)'}
            </span>
          </span>
          <span className="text-slate-600">|</span>
          <span>{pageFields.length} حقل في الصفحة {page}</span>
          {selectedFields.length > 0 && (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400 font-bold font-mono">
                {selectedFields.length} حقل محدد
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="text-slate-500">
            ⌥ Opt + سحب = تمدد من الطرفين | Shift + نقر = تحديد متعدد | مسافة = تحريك
          </span>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale(0.5)}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              50%
            </button>
            <button
              onClick={() => setScale(0.75)}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              75%
            </button>
            <button
              onClick={() => setScale(0.95)}
              className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold"
            >
              ملء الشاشة
            </button>
            <button
              onClick={() => setScale(1.25)}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              125%
            </button>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* PHOTOSHOP CONTEXT MENU (Right Click on Field)                             */}
      {/* ========================================================================= */}
      {contextMenu && (
        <div
          dir="rtl"
          className="fixed z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 text-xs text-slate-200 min-w-[190px] animate-in fade-in zoom-in-95"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
        >
          <button
            onClick={() => duplicateSelectedFields()}
            className="w-full text-right px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between"
          >
            <span>تكرار الحقول المحددة</span>
            <span className="text-[10px] text-slate-400 font-mono">Ctrl+D</span>
          </button>
          <button
            onClick={handleCopy}
            className="w-full text-right px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between"
          >
            <span>نسخ للحافظة</span>
            <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
          </button>
          <div className="h-[1px] bg-slate-800 my-1" />
          <button
            onClick={() => {
              alignComponents('centerH');
              setContextMenu(null);
            }}
            className="w-full text-right px-3 py-1.5 hover:bg-slate-800"
          >
            توسيط أفقي
          </button>
          <button
            onClick={() => {
              alignComponents('centerV');
              setContextMenu(null);
            }}
            className="w-full text-right px-3 py-1.5 hover:bg-slate-800"
          >
            توسيط رأسي
          </button>
          <button
            onClick={() => {
              alignComponents('fullWidth');
              setContextMenu(null);
            }}
            className="w-full text-right px-3 py-1.5 hover:bg-slate-800"
          >
            تمديد لكامل الصفحة
          </button>
          {selectedFields.length > 2 && (
            <>
              <div className="h-[1px] bg-slate-800 my-1" />
              <button
                onClick={() => {
                  distributeSpacing('vertical');
                  setContextMenu(null);
                }}
                className="w-full text-right px-3 py-1.5 hover:bg-slate-800"
              >
                توزيع مسافات رأسية متساوية
              </button>
              <button
                onClick={() => {
                  distributeSpacing('horizontal');
                  setContextMenu(null);
                }}
                className="w-full text-right px-3 py-1.5 hover:bg-slate-800"
              >
                توزيع مسافات أفقية متساوية
              </button>
            </>
          )}
          <div className="h-[1px] bg-slate-800 my-1" />
          <button
            onClick={deleteSelectedFields}
            className="w-full text-right px-3 py-1.5 hover:bg-rose-950/60 text-rose-400 flex items-center justify-between"
          >
            <span>حذف المحدد</span>
            <span className="text-[10px] text-rose-400 font-mono">Del</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KEYBOARD SHORTCUTS GUIDE MODAL (Photoshop / Figma Cheatsheet)            */}
      {/* ========================================================================= */}
      {showShortcutsModal && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-['IBM_Plex_Sans_Arabic']"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                دليل اختصارات الاستوديو (Photoshop & Figma Shortcuts)
              </h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* Figma Symmetrical & Multi-Selection Highlight */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5">
                <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  ميزات فيجما المتقدمة الجديدة (Figma Tools):
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  <li>
                    <b className="text-white">Option (Alt) + سحب مقبض التحجيم:</b> تمدد متناظر من الطرفين انطلاقاً من المركز (Expand Both Sides).
                  </li>
                  <li>
                    <b className="text-white">Shift + نقر على الحقول:</b> تحديد متعدد لحقول مختلفة معاً.
                  </li>
                  <li>
                    <b className="text-white">أدوات المحاذاة والتباعد:</b> توسيط الحقول معاً، وتوزيع المسافات بالتساوي، ورص الحقول بمسافة مخصصة.
                  </li>
                </ul>
              </div>

              {/* Tools Section */}
              <div>
                <h4 className="font-bold text-amber-400 mb-2 border-b border-slate-800 pb-1 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  أدوات الرسم والتحديد السريعة
                </h4>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">أداة التحديد والتحريك</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold">V</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">أداة اليد لتحريك اللوحة</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold">H أو مسافة</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">تحديد كل الحقول بالصفحة</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold">Ctrl + A</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">رسم حقل نص</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold">T</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">رسم قائمة منسدلة DropDown</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-cyan-300 font-bold">D</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">ملاحظات متعدد الأسطر</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold">M / A</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">مربع صورة / بطاقة</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-rose-300 font-bold">I</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">رقم / رقم قومي</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-emerald-300 font-bold">N</kbd>
                  </div>
                </div>
              </div>

              {/* Transformation & Nudge Section */}
              <div>
                <h4 className="font-bold text-amber-400 mb-2 border-b border-slate-800 pb-1 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5" />
                  التحريك والتوسيع المتناظر (Nudging & Expanding)
                </h4>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">تمدد متناظر من المركز</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold">Option (Alt) + سحب</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">سحب مع التكرار المباشر</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">Alt + سحب الحقل</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">تحريك دقيق (0.1%)</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">الأسهم ↑ ↓ ← →</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">تحريك سريع (1.0%)</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">Shift + الأسهم</kbd>
                  </div>
                </div>
              </div>

              {/* Clipboard & History */}
              <div>
                <h4 className="font-bold text-amber-400 mb-2 border-b border-slate-800 pb-1 flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5" />
                  الحافظة والتاريخ
                </h4>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">تراجع Undo</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">Ctrl + Z</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">إعادة Redo</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">Ctrl + Y</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">تكرار المحدد</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">Ctrl + D / Ctrl + J</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">نسخ / لصق</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">Ctrl + C / V</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">حذف الحقول المحددة</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-rose-300">Del / Backspace</kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-slate-300 font-sans">إلغاء التحديد</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 border-t border-slate-800 flex justify-end bg-slate-900/80">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
              >
                فهمت، إغلاق الدليل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Code Modal */}
      {showJsonModal && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-['IBM_Plex_Sans_Arabic']"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-sky-400" />
                تصدير إحداثيات الحقول (JSON)
              </h3>
              <button
                onClick={() => setShowJsonModal(false)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <p className="text-xs text-emerald-400 mb-2 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                تم نسخ الكود للحافظة تلقائياً!
              </p>
              <pre
                dir="ltr"
                className="text-[11px] font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto"
              >
                {JSON.stringify(currentLayout, null, 2)}
              </pre>
            </div>
            <div className="p-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowJsonModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Options Import Modal */}
      {showBulkOptionsModal && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-['IBM_Plex_Sans_Arabic']"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-cyan-400" />
                إضافة خيارات مجمعة للقائمة المنسدلة (Bulk Data Import)
              </h3>
              <button
                onClick={() => setShowBulkOptionsModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-300 text-[11px] leading-relaxed">
                الصق بياناتك دفعة واحدة في المربع أدناه مفصولة إما بـ <b>فواصل (,) أو (،)</b> أو <b>أسطر جديدة</b>:
              </p>

              <textarea
                rows={8}
                value={bulkInputText}
                onChange={(e) => setBulkInputText(e.target.value)}
                placeholder="مثال:
كنيسة السيدة العذراء والشهيد العظيم أبانوب - الخصوص,
كنيسة السيدة العذراء والانبا موسي - الخصوص,
كنيسة الشهيد العظيم مارجرجس - قها"
                className="w-full bg-slate-950 border border-cyan-800/60 rounded-xl p-3 text-white font-medium text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none font-sans"
              />

              {/* Live parsed preview badge */}
              <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[11px]">
                  عدد العناصر المكتشفة في النص:
                </span>
                <span className="font-bold font-mono text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-800/60">
                  {parseBulkOptions(bulkInputText).length} خيار فريد
                </span>
              </div>

              {/* Quick paste church template button inside modal */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">تجربة سريعة:</span>
                <button
                  type="button"
                  onClick={() => setBulkInputText(EGYPTIAN_CHURCHES_PRESET.join(',\n'))}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2 py-1 rounded font-bold transition-colors"
                >
                  الصق قائمة كنائس الخصوص والخانكة والقلج (34 كنيسة)
                </button>
              </div>
            </div>

            <div className="p-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-900/80">
              <button
                onClick={() => setShowBulkOptionsModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                إلغاء
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyBulkOptions(false)}
                  disabled={parseBulkOptions(bulkInputText).length === 0}
                  className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white text-xs font-bold transition-all"
                >
                  إلحاق بالخيارات الحالية (Append)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyBulkOptions(true)}
                  disabled={parseBulkOptions(bulkInputText).length === 0}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow"
                >
                  استبدال كافة الخيارات (Replace All)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
