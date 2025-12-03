import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PrintJob } from '../types';
import { CheckCircle, Printer, Sparkles } from 'lucide-react';

interface TicketViewProps {
  job: PrintJob;
  onComplete: () => void;
}

export const TicketView: React.FC<TicketViewProps> = ({ job, onComplete }) => {
  const [status, setStatus] = useState<'printing' | 'done' | 'error'>('printing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 將列印工作送到後端，而不是觸發瀏覽器的 window.print()
    const timer = setTimeout(() => {
      const sendPrintJob = async () => {
        try {
          const res = await fetch('http://localhost:4000/api/print-jobs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(job),
          });
          let printed = true;
          let backendError: string | undefined;
          try {
            const data = await res.json();
            if (typeof data.printed === 'boolean') {
              printed = data.printed;
            }
            if (data.error) {
              backendError = data.error as string;
            }
          } catch {
            // ignore json parse errors
          }

          if (!res.ok || !printed) {
            setErrorMessage(
              backendError ||
                `列印失敗，請確認印表機連線或設定（HTTP ${res.status}）。`
            );
            setStatus('error');
            return;
          }
        } catch (error) {
          console.error('Failed to send print job to backend', error);
          setErrorMessage('無法連線到後端列印服務，請稍後再試或通知工作人員。');
          setStatus('error');
          return;
        } finally {
          setTimeout(() => {
            setStatus(prev => (prev === 'printing' ? 'done' : prev));
          }, 1000);
        }
      };

      void sendPrintJob();
    }, 1500);
    return () => clearTimeout(timer);
  }, [job]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center">
      
      {/* Backdrop Blur */}
      <motion.div 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Status Text (Floating above) */}
      <div className="absolute top-20 w-full text-center z-10 print:hidden pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-white"
        >
           {status === 'printing' && (
             <div className="flex flex-col items-center gap-2">
               <Printer className="animate-pulse text-emerald-400" size={32} />
               <span className="uppercase tracking-[0.2em] text-sm font-bold">正在送往印表機...</span>
             </div>
           )}
           {status === 'done' && (
             <div className="flex flex-col items-center gap-2">
               <CheckCircle className="text-emerald-400" size={32} />
               <span className="uppercase tracking-[0.2em] text-sm font-bold">列印完成</span>
             </div>
           )}
           {status === 'error' && (
             <div className="flex flex-col items-center gap-2">
               <Printer className="text-red-400" size={32} />
               <span className="uppercase tracking-[0.2em] text-sm font-bold">列印失敗</span>
               {errorMessage && (
                 <span className="mt-1 text-xs text-red-200 max-w-md mx-auto">
                   {errorMessage}
                 </span>
               )}
             </div>
           )}
        </motion.div>
      </div>

      {/* The Ticket - Sliding Up from Bottom */}
      <motion.div 
        id="print-area" 
        className="mt-4 mb-4 bg-white text-black w-[320px] min-h-[450px] p-8 shadow-2xl font-mono relative overflow-hidden z-20"
        initial={{ 
            y: '100vh', // Start off-screen bottom
            opacity: 0,
            scale: 0.95
        }}
        animate={{ 
            y: 0,
            opacity: 1,
            scale: 1
        }}
        transition={{ 
            type: "spring",
            damping: 25,
            stiffness: 120,
            mass: 0.8
        }}
      >
        {/* Shimmer Effect Overlay */}
        <motion.div 
            className="absolute inset-0 z-30 pointer-events-none bg-gradient-to-r from-transparent via-white/60 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
        />

        {/* Decorative Header Pattern */}
        <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4 relative z-10">
           <Sparkles size={16} className="text-slate-400" />
           <h1 className="text-xl font-black uppercase tracking-widest">{job.categoryName}</h1>
           <Sparkles size={16} className="text-slate-400" />
        </div>

        <div className="text-center mb-6 relative z-10">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{job.timestamp}</p>
          <div className="inline-block bg-black text-white px-3 py-1 rounded-full text-sm font-bold">
            #{String(job.queueNumber).padStart(3, '0')}
          </div>
        </div>

        <div className="mb-8 text-center relative z-10">
          <h2 className="text-2xl font-bold leading-tight mb-2">{job.item.title}</h2>
          {job.item.subtitle && <p className="text-sm italic text-slate-600 font-serif">{job.item.subtitle}</p>}
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6 relative z-10">
           <p className="whitespace-pre-wrap leading-relaxed text-sm text-slate-800 text-justify">
             {job.item.content}
           </p>
        </div>

        {job.item.footer && (
          <div className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 relative z-10 mt-auto">
            *** {job.item.footer} ***
          </div>
        )}

         {/* Bottom Barcode */}
         <div className="absolute bottom-0 left-0 w-full h-2 bg-slate-900" />
      </motion.div>

      {/* Done / Close Button */}
      {status !== 'printing' && (
        <motion.button 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onComplete} 
          className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-3 rounded-full font-bold hover:bg-white hover:text-slate-900 transition-all z-50 print:hidden"
        >
          關閉
        </motion.button>
      )}
    </div>
  );
};