import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { 
  X, 
  Check, 
  Crop as CropIcon, 
  Pencil, 
  RotateCcw, 
  Undo,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ImageEditorProps {
  image: string;
  onSave: (editedImage: string) => void;
  onCancel: () => void;
  theme?: 'light' | 'dark';
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ image, onSave, onCancel, theme = 'light' }) => {
  const [mode, setMode] = useState<'crop' | 'draw'>('crop');
  
  // Cropping state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  
  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#EF4444'); // Default red pen
  const [brushSize, setBrushSize] = useState(3);
  const [history, setHistory] = useState<string[]>([]);
  
  const [editingImage, setEditingImage] = useState(image);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCropImage = async () => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = image;
    
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      img,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
    setEditingImage(croppedBase64);
    setMode('draw');
  };

  // Initialize Canvas for Drawing
  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.src = editingImage;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            setHistory([canvas.toDataURL()]);
        };
    }
  }, [mode, editingImage]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'draw') return;
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (canvasRef.current) {
        setHistory(prev => [...prev, canvasRef.current!.toDataURL()]);
    }
    
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath(); // Reset path
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const undo = () => {
    if (history.length <= 1 || !canvasRef.current) return;
    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    const prevState = newHistory[newHistory.length - 1];
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = prevState;
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setHistory(newHistory);
    };
  };

  const handleSave = () => {
    if (mode === 'crop') {
        createCropImage();
    } else {
        if (canvasRef.current) {
            onSave(canvasRef.current.toDataURL('image/jpeg', 0.8));
        }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
        onClick={onCancel}
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={cn(
          "relative w-full max-w-4xl bg-white sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-full sm:h-[80vh]",
          theme === 'dark' && "bg-[#1E1E1E]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2 sm:gap-4">
            <h3 className={cn("text-lg sm:text-xl font-black text-[#2B2D42] hidden sm:block", theme === 'dark' && "text-white")}>
              {mode === 'crop' ? 'Crop' : 'Draw'}
            </h3>
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
               <button 
                 onClick={() => setMode('crop')}
                 className={cn(
                   "px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-2",
                   mode === 'crop' ? "bg-white dark:bg-white/10 shadow-sm text-brand-indigo" : "text-slate-400"
                 )}
               >
                 <CropIcon className="h-3 w-3" /> Crop
               </button>
               <button 
                 onClick={() => {
                   if (mode === 'crop') createCropImage();
                   else setMode('draw');
                 }}
                 className={cn(
                   "px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-2",
                   mode === 'draw' ? "bg-white dark:bg-white/10 shadow-sm text-brand-indigo" : "text-slate-400"
                 )}
               >
                 <Pencil className="h-3 w-3" /> Draw
               </button>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 relative bg-slate-50 dark:bg-black/20 overflow-hidden flex items-center justify-center">
          {mode === 'crop' ? (
            <div className="relative w-full h-full">
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={4 / 3}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center p-8 overflow-auto">
               <canvas 
                 ref={canvasRef}
                 onMouseDown={startDrawing}
                 onMouseMove={draw}
                 onMouseUp={stopDrawing}
                 onMouseLeave={stopDrawing}
                 onTouchStart={startDrawing}
                 onTouchMove={draw}
                 onTouchEnd={stopDrawing}
                 className="max-w-full max-h-full shadow-2xl bg-white cursor-crosshair rounded-lg"
               />
            </div>
          )}
        </div>

        {/* Footer / Controls */}
        <div className="p-4 sm:p-6 bg-white dark:bg-[#1E1E1E] border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
           <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6">
              {mode === 'crop' ? (
                <div className="flex items-center gap-4 w-full sm:w-auto">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-max">Zoom</span>
                   <input 
                     type="range"
                     min={1}
                     max={3}
                     step={0.1}
                     value={zoom}
                     onChange={(e) => setZoom(Number(e.target.value))}
                     className="flex-1 sm:w-32 accent-brand-indigo"
                   />
                </div>
              ) : (
                <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6">
                   <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none py-1">
                      {['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#000000'].map(c => (
                        <button 
                          key={c}
                          onClick={() => setColor(c)}
                          style={{ backgroundColor: c }}
                          className={cn(
                            "h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 border-white dark:border-slate-800 shadow-sm transition-transform shrink-0",
                            color === c && "scale-110 sm:scale-125 border-brand-indigo"
                          )}
                        />
                      ))}
                   </div>
                   <div className="h-6 sm:h-8 w-px bg-slate-100 dark:bg-white/10" />
                   <div className="flex items-center gap-2 sm:gap-3">
                      <button 
                        onClick={undo} 
                        disabled={history.length <= 1}
                        className="p-1.5 sm:p-2 bg-slate-50 dark:bg-white/5 rounded-xl text-slate-400 disabled:opacity-30 hover:text-brand-indigo transition-colors"
                      >
                         <Undo className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => {
                           const ctx = canvasRef.current?.getContext('2d');
                           if (!ctx || !canvasRef.current) return;
                           const img = new Image();
                           img.src = editingImage;
                           img.onload = () => {
                             ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
                             ctx.drawImage(img, 0, 0);
                             setHistory([canvasRef.current!.toDataURL()]);
                           };
                        }}
                        className="p-1.5 sm:p-2 bg-slate-50 dark:bg-white/5 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                      >
                         <RotateCcw className="h-4 w-4" />
                      </button>
                   </div>
                </div>
              )}
           </div>

           <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
              <button 
                onClick={onCancel}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors uppercase tracking-widest border border-slate-100 dark:border-white/5 sm:border-none"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex-[2] sm:flex-none px-6 sm:px-8 py-2.5 sm:py-3 bg-brand-indigo text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black shadow-xl shadow-brand-indigo/20 flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <Check className="h-4 w-4" /> {mode === 'crop' ? (window.innerWidth < 640 ? 'Confirm' : 'Confirm Crop') : (window.innerWidth < 640 ? 'Save' : 'Save Image')}
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};
