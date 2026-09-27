'use client';
import { useRef } from 'react';
import { Camera, Upload, ImagePlus, ArrowRight } from 'lucide-react';

export function CameraUpload({ onFile, disabled }: { onFile: (file: File) => void; disabled: boolean }) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  function receive(files: FileList | null) { if (files?.[0] && !disabled) onFile(files[0]); }
  return <div className="capture-box" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); receive(e.dataTransfer.files); }}>
    <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" aria-label="Upload object photo" tabIndex={-1} disabled={disabled} onChange={e => { receive(e.target.files); e.target.value = ''; }}/>
    <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="visually-hidden" aria-label="Take object photo" tabIndex={-1} disabled={disabled} onChange={e => { receive(e.target.files); e.target.value = ''; }}/>
    <div className="capture-corners"><div className="capture-crosshair"><ImagePlus size={54} strokeWidth={1.4}/></div><span className="mono">YOUR NEXT CHAMPION GOES HERE</span></div>
    <div className="capture-buttons"><button className="button primary" onClick={() => cameraRef.current?.click()} disabled={disabled}><Camera size={19}/>Take photo<ArrowRight size={18}/></button><button className="button secondary" onClick={() => uploadRef.current?.click()} disabled={disabled}><Upload size={18}/>Upload image</button></div>
    <p className="fine-print">Or drop a photo here · JPG, PNG, WebP · Up to 25 MB</p>
  </div>;
}
