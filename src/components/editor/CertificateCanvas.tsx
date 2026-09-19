import React, { useRef, useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Template,
  TemplateElement,
  PaperSize,
  Orientation,
  ImageFitMode,
} from '../../types';
import { optimizeImage } from '../../utils/imageOptimizer';
import { api } from '../../services/apiService';
import { useToast } from '../../context/ToastContext';
import {
  Upload,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  QrCode,
  Image as ImageIcon,
} from 'lucide-react';

export const PAPER_DIMENSIONS_MM: Record<PaperSize, { width: number; height: number }> = {
  letter: { width: 279.4, height: 215.9 },
  a4: { width: 297, height: 210 },
  legal: { width: 355.6, height: 215.9 },
  a3: { width: 420, height: 297 },
  custom: { width: 280, height: 200 },
};

interface CertificateCanvasProps {
  template: Partial<Template>;
  elements: TemplateElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<TemplateElement>) => void;
  onUpdateTemplate: (updates: Partial<Template>) => void;
  onDuplicateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  zoom: number; // 0.5 to 2.0
  onZoomChange: (newZoom: number) => void;
  previewSampleData?: boolean;
}

export const CertificateCanvas: React.FC<CertificateCanvasProps> = ({
  template,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onUpdateTemplate,
  onDuplicateElement,
  onDeleteElement,
  zoom,
  onZoomChange,
  previewSampleData = false,
}) => {
  const toast = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dragging state tracking
  const [dragState, setDragState] = useState<{
    elementId: string;
    startX: number;
    startY: number;
    startElemX: number;
    startElemY: number;
    hasMoved: boolean;
  } | null>(null);

  // QR code cached preview URLs
  const [qrPreviews, setQrPreviews] = useState<Record<string, string>>({});

  // Compute aspect ratio & canvas dimensions
  const pageSize = (template.page_size as PaperSize) || 'letter';
  const orientation = template.orientation || 'landscape';
  const rawSize =
    pageSize === 'custom' && template.custom_width && template.custom_height
      ? { width: template.custom_width, height: template.custom_height }
      : PAPER_DIMENSIONS_MM[pageSize] || PAPER_DIMENSIONS_MM.letter;

  const docWidth = orientation === 'landscape' ? Math.max(rawSize.width, rawSize.height) : Math.min(rawSize.width, rawSize.height);
  const docHeight = orientation === 'landscape' ? Math.min(rawSize.width, rawSize.height) : Math.max(rawSize.width, rawSize.height);
  const aspectRatio = docWidth / docHeight;

  // Base canvas resolution width in px
  const baseCanvasWidth = 900;
  const canvasWidthPx = baseCanvasWidth * zoom;
  const canvasHeightPx = (baseCanvasWidth / aspectRatio) * zoom;

  // Generate QR code data URLs for elements
  useEffect(() => {
    elements
      .filter((el) => el.type === 'qr_code')
      .forEach((el) => {
        const dummyUrl = `${window.location.origin}/verify/CERT-EJEMPLO-2026`;
        QRCode.toDataURL(dummyUrl, {
          width: 250,
          margin: 1,
          color: {
            dark: el.qrDarkColor || '#000000',
            light: el.qrLightColor || '#ffffff',
          },
        })
          .then((url) => {
            setQrPreviews((prev) => ({ ...prev, [el.id]: url }));
          })
          .catch((e) => console.error('QR code error:', e));
      });
  }, [elements]);

  // Handle image replacement from file input
  const handleImageFile = async (file: File) => {
    try {
      toast.info('Optimizando imagen en frontend (WebP 95%)...');
      const optimized = await optimizeImage(file, { quality: 0.95, maxDimension: 3840 });

      const uploadRes = await api.uploadOptimizedImage(optimized.file, 'template');

      // Suggest orientation if aspect ratio differs substantially
      const suggestedOrientation = optimized.suggestedOrientation;
      const updates: Partial<Template> = {
        image_path: uploadRes.relativePath,
      };

      if (suggestedOrientation !== template.orientation) {
        toast.info(
          `Orientación detectada: ${suggestedOrientation === 'landscape' ? 'Horizontal' : 'Vertical'}. Puedes mantenerla o ajustarla libremente.`
        );
      }

      onUpdateTemplate(updates);
      toast.success('Imagen de fondo cargada y optimizada en WebP exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar y subir la imagen');
    }
  };

  // Clipboard paste listener to paste background image directly into canvas
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [template.orientation]);

  // Drag & drop handlers for canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleImageFile(file);
      }
    }
  };

  // POINTER EVENTS for fluid, jitter-free dragging and persistent selection
  const handleElementPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    element: TemplateElement
  ) => {
    e.stopPropagation();
    // Keep selection persistent immediately on down
    onSelectElement(element.id);

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    setDragState({
      elementId: element.id,
      startX: e.clientX,
      startY: e.clientY,
      startElemX: element.xPercent,
      startElemY: element.yPercent,
      hasMoved: false,
    });
  };

  const handleElementPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || !canvasRef.current) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    // Movement threshold (4px) to disambiguate click from drag
    if (!dragState.hasMoved && Math.hypot(dx, dy) > 4) {
      setDragState((prev) => (prev ? { ...prev, hasMoved: true } : null));
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaXPercent = (dx / rect.width) * 100;
    const deltaYPercent = (dy / rect.height) * 100;

    let newX = Math.min(100, Math.max(0, dragState.startElemX + deltaXPercent));
    let newY = Math.min(100, Math.max(0, dragState.startElemY + deltaYPercent));

    onUpdateElement(dragState.elementId, {
      xPercent: Number(newX.toFixed(2)),
      yPercent: Number(newY.toFixed(2)),
    });
  };

  const handleElementPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;

    const target = e.currentTarget;
    try {
      target.releasePointerCapture(e.pointerId);
    } catch (err) {}

    // Selection stays completely persistent after release!
    setDragState(null);
  };

  // Clicking blank canvas deselects element
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'IMG') {
      onSelectElement(null);
    }
  };

  // Sample recipient preview texts
  const sampleValues: Record<string, string> = {
    full_name: 'Lic. Carlos Eduardo Mendoza',
    first_name: 'Carlos Eduardo',
    last_name: 'Mendoza Gutiérrez',
    date: new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
    certificate_id: 'CERT-A89F-4B2C-2026',
    field: 'Especialista en Desarrollo Cloud',
  };

  // Background style according to image_fit mode
  const fitMode = template.image_fit || 'fit';
  const customScale = template.image_custom_scale ?? 1;
  const customX = template.image_custom_x ?? 0;
  const customY = template.image_custom_y ?? 0;

  let bgImgStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  };

  if (fitMode === 'fit') {
    bgImgStyle.objectFit = 'contain';
  } else if (fitMode === 'cover') {
    bgImgStyle.objectFit = 'cover';
  } else if (fitMode === 'stretch') {
    bgImgStyle.objectFit = 'fill';
  } else if (fitMode === 'custom') {
    bgImgStyle.objectFit = 'contain';
    bgImgStyle.transform = `translate(${customX}px, ${customY}px) scale(${customScale})`;
    bgImgStyle.transformOrigin = 'center center';
  }

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative select-none">
      {/* Canvas Top Bar */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-medium text-slate-200 uppercase tracking-wider text-[11px] bg-slate-800 px-2 py-0.5 rounded">
            {pageSize} ({docWidth.toFixed(0)} × {docHeight.toFixed(0)} mm)
          </span>
          <span>•</span>
          <span className="text-slate-300">
            {orientation === 'landscape' ? 'Horizontal' : 'Vertical'}
          </span>
          <span>•</span>
          <span className="capitalize text-slate-400">Ajuste: {fitMode}</span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => onZoomChange(Math.max(0.4, zoom - 0.1))}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reducir zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-medium text-slate-300 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(2.0, zoom + 0.1))}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onZoomChange(1)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Ajustar al 100%"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hidden file input for background template replacement */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleImageFile(e.target.files[0]);
          }
        }}
      />

      {/* Canvas Workspace scroll container */}
      <div
        className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center canvas-grid"
        onClick={handleCanvasClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Certificate Artboard */}
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="relative bg-white shadow-2xl rounded-sm transition-shadow duration-300 overflow-hidden ring-1 ring-slate-800 cursor-default"
          style={{
            width: `${canvasWidthPx}px`,
            height: `${canvasHeightPx}px`,
            maxWidth: '100%',
          }}
        >
          {/* Background template image */}
          {template.image_path ? (
            <img
              src={`/data/${template.image_path}`}
              alt="Plantilla Certificado"
              style={bgImgStyle}
              className="select-none pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-300 bg-slate-50/70 select-none">
              <ImageIcon className="w-12 h-12 text-slate-400 mb-3" />
              <h4 className="text-sm font-semibold text-slate-700 mb-1">
                Sin imagen de plantilla de fondo
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                Arrastra una imagen aquí, pégala con Ctrl+V desde el portapapeles o presiona el botón para cargarla.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
              >
                <Upload className="w-4 h-4" />
                Subir o Reemplazar Fondo (WebP)
              </button>
            </div>
          )}

          {/* Draggable & Persistently Selectable Elements */}
          {elements.map((el) => {
            const isSelected = el.id === selectedElementId;

            // Content calculation
            let displayContent: React.ReactNode = el.staticText || el.label || 'Texto';
            if (previewSampleData) {
              if (el.type === 'full_name') displayContent = sampleValues.full_name;
              else if (el.type === 'first_name') displayContent = sampleValues.first_name;
              else if (el.type === 'last_name') displayContent = sampleValues.last_name;
              else if (el.type === 'date') displayContent = sampleValues.date;
              else if (el.type === 'certificate_id') displayContent = sampleValues.certificate_id;
              else if (el.type === 'field') displayContent = sampleValues.field;
            } else {
              if (el.type === 'full_name') displayContent = '{{Nombre Completo}}';
              else if (el.type === 'first_name') displayContent = '{{Nombres}}';
              else if (el.type === 'last_name') displayContent = '{{Apellidos}}';
              else if (el.type === 'date') displayContent = '{{Fecha}}';
              else if (el.type === 'certificate_id') displayContent = '{{ID Certificado}}';
              else if (el.type === 'field') displayContent = `{{${el.fieldKey || 'Campo'}}}`;
            }

            // QR Code rendering
            if (el.type === 'qr_code') {
              const qrPx = ((el.qrSize || 25) / docWidth) * canvasWidthPx;
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => handleElementPointerDown(e, el)}
                  onPointerMove={handleElementPointerMove}
                  onPointerUp={handleElementPointerUp}
                  className={`absolute touch-none cursor-move transition-transform duration-75 select-none ${
                    isSelected
                      ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white shadow-xl z-30'
                      : 'hover:ring-1 hover:ring-indigo-400/60 z-20'
                  }`}
                  style={{
                    left: `${el.xPercent}%`,
                    top: `${el.yPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${qrPx}px`,
                    height: `${qrPx}px`,
                  }}
                >
                  {qrPreviews[el.id] ? (
                    <img
                      src={qrPreviews[el.id]}
                      alt="Código QR"
                      className="w-full h-full object-contain pointer-events-none rounded"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center p-2 rounded">
                      <QrCode className="w-8 h-8" />
                    </div>
                  )}

                  {/* Persistent selection indicator handles */}
                  {isSelected && (
                    <>
                      <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full pointer-events-none" />
                      <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full pointer-events-none" />
                      <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full pointer-events-none" />
                      <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full pointer-events-none" />
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow whitespace-nowrap font-sans font-semibold pointer-events-none">
                        QR Oficial ({el.xPercent.toFixed(1)}%, {el.yPercent.toFixed(1)}%)
                      </div>
                    </>
                  )}
                </div>
              );
            }

            // Typography styling
            const scaledFontSize = ((el.fontSize || 18) * (canvasWidthPx / baseCanvasWidth)) * 0.95;
            const elementStyle: React.CSSProperties = {
              left: `${el.xPercent}%`,
              top: `${el.yPercent}%`,
              transform:
                el.textAlign === 'center'
                  ? 'translate(-50%, -50%)'
                  : el.textAlign === 'right'
                  ? 'translate(-100%, -50%)'
                  : 'translate(0%, -50%)',
              fontFamily: el.fontFamily || 'Inter',
              fontSize: `${scaledFontSize}px`,
              fontWeight: el.fontWeight || 'normal',
              fontStyle: el.fontStyle || 'normal',
              textDecoration: el.textDecoration || 'none',
              textTransform: el.textTransform || 'none',
              textAlign: el.textAlign || 'center',
              color: el.color || '#1e293b',
              letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : 'normal',
            };

            return (
              <div
                key={el.id}
                onPointerDown={(e) => handleElementPointerDown(e, el)}
                onPointerMove={handleElementPointerMove}
                onPointerUp={handleElementPointerUp}
                className={`absolute touch-none cursor-move px-2 py-0.5 rounded transition-shadow duration-75 select-none ${
                  isSelected
                    ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white bg-indigo-50/40 z-30'
                    : 'hover:ring-1 hover:ring-indigo-400/50 hover:bg-slate-900/5 z-20'
                }`}
                style={elementStyle}
              >
                <span>{displayContent}</span>

                {/* Persistent selection indicator handles */}
                {isSelected && (
                  <>
                    <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-indigo-600 border border-white rounded-full pointer-events-none" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-600 border border-white rounded-full pointer-events-none" />
                    <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-indigo-600 border border-white rounded-full pointer-events-none" />
                    <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-indigo-600 border border-white rounded-full pointer-events-none" />
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] px-1.5 py-0.2 rounded shadow whitespace-nowrap font-sans font-medium pointer-events-none">
                      {el.label || el.type} ({el.xPercent.toFixed(1)}%, {el.yPercent.toFixed(1)}%)
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Canvas Quick Actions (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-slate-200 text-xs border border-slate-700 shadow-lg backdrop-blur-md transition-colors"
          title="Reemplazar imagen de fondo con WebP optimizado"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Reemplazar Fondo</span>
        </button>
      </div>

      {/* Persistent Selected Element Floating Quick Bar (Bottom Right if element selected) */}
      {selectedElement && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 rounded-xl p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <span className="text-[11px] font-medium text-slate-300 px-2 py-0.5 bg-slate-800 rounded">
            {selectedElement.label || selectedElement.type}
          </span>
          <button
            onClick={() => onDuplicateElement(selectedElement.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Duplicar elemento"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeleteElement(selectedElement.id)}
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors"
            title="Eliminar elemento"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
