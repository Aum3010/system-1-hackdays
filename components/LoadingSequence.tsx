'use client';
import { useEffect, useState } from 'react';
import { ScanLine, Check, Sparkles } from 'lucide-react';

const messages = ['Scanning your object…', 'Judging battle potential…', 'Assigning questionable powers…', 'Summoning your fighter…'];
export function LoadingSequence({ image }: { image?: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => { const timer = setInterval(() => setIndex(i => Math.min(i + 1, messages.length - 1)), 2600); return () => clearInterval(timer); }, []);
  return <div className="loading-panel"><div className="loading-image">{image ? <img src={image} alt="Your object being scanned"/> : <ScanLine size={72}/>}<div className="scan-beam"/><span className="scan-badge"><Sparkles size={14}/>A LEGEND IS LOADING</span></div><h2 aria-live="polite">{messages[index]}</h2><div className="loading-steps">{messages.map((message, i) => <span key={message} className={i <= index ? 'active' : ''}>{i < index ? <Check size={14}/> : <span className="loading-dot"/>}<span className="visually-hidden">{message}</span></span>)}</div><p>No object is too ordinary. No power is too ridiculous.</p></div>;
}
