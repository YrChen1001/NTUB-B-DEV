import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category, Item, AppMode, PrintJob } from './types';
import { getCategories, getItems, saveCategories, saveItems } from './services/storageService';
import { AdminPanel } from './components/AdminPanel';
import { TicketView } from './components/TicketView';
import { Settings, ChevronLeft, Sparkles, Hexagon } from 'lucide-react';

// --- Component: Cosmic Shard (Layer 2 Item) ---

interface CosmicShardProps {
  item: Item;
  onLongPress: (item: Item, rect: DOMRect) => void;
  onRumble: (active: boolean) => void;
  index: number;
}

const CosmicShard: React.FC<CosmicShardProps> = ({ item, onLongPress, onRumble, index }) => {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const PRESS_DURATION = 1500;

  // Chaotic Float Params
  const randomY = useRef(Math.random() * 20 - 10);
  const randomRotate = useRef(Math.random() * 10 - 5);
  const duration = useRef(3 + Math.random() * 4);

  const startPress = (e: React.TouchEvent | React.MouseEvent) => {
    setIsPressing(true);
    onRumble(true); // Trigger global rumble
    timerRef.current = window.setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        onLongPress(item, rect);
      }
    }, PRESS_DURATION);
  };

  const cancelPress = () => {
    setIsPressing(false);
    onRumble(false); // Stop global rumble
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <motion.div
      ref={containerRef}
      className="relative m-4"
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: [0, randomY.current, 0],
        rotate: [0, randomRotate.current, 0]
      }}
      transition={{ 
        opacity: { delay: index * 0.1 },
        y: { repeat: Infinity, duration: duration.current, ease: "easeInOut" },
        rotate: { repeat: Infinity, duration: duration.current * 1.5, ease: "easeInOut" }
      }}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
    >
      {/* The Visual Shard */}
      <motion.div
        className={`
          glass-shard w-64 h-32 rounded-xl flex flex-col items-center justify-center p-4
          cursor-pointer border-l-4 select-none relative overflow-hidden
        `}
        animate={isPressing ? {
          scale: 0.95,
          borderColor: '#ffffff',
          boxShadow: "0 0 40px rgba(255,255,255,0.6)",
          x: [0, -3, 3, -3, 0] // Local Shaking
        } : {
          scale: 1,
          borderColor: 'rgba(255,255,255,0.2)',
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.36)",
        }}
        transition={{ duration: isPressing ? 0.05 : 0.5 }}
      >
         {/* Charge Progress Background */}
         {isPressing && (
            <motion.div 
              className="absolute inset-0 bg-white/20"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: PRESS_DURATION / 1000, ease: "linear" }}
            />
         )}

         <div className="relative z-10 text-center pointer-events-none">
            <motion.div
               animate={isPressing ? { rotate: 360 } : { rotate: 0 }}
               transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
               className="mb-2 inline-block"
            >
              <Hexagon size={20} className="text-white/80" />
            </motion.div>
            <h3 className="text-lg font-bold text-white tracking-wider uppercase">{item.title}</h3>
            <p className="text-[10px] text-white/60 font-mono mt-1">{item.subtitle || '///'}</p>
         </div>

         {/* Decorative corners */}
         <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/50"></div>
         <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/50"></div>
      </motion.div>
    </motion.div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<AppMode>('USER_HOME');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activePrintJob, setActivePrintJob] = useState<PrintJob | null>(null);
  
  // Global Interaction States
  const [isRumbling, setIsRumbling] = useState(false);

  // --- Auto-Scroll Logic for Layer 1 ---
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollSpeedRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const animateScroll = () => {
      if (scrollContainerRef.current && scrollSpeedRef.current !== 0) {
        scrollContainerRef.current.scrollLeft += scrollSpeedRef.current;
      }
      animationFrameRef.current = requestAnimationFrame(animateScroll);
    };

    // Only activate scroll loop in Layer 1 view
    if (mode === 'USER_HOME' && !selectedCategoryId) {
      animationFrameRef.current = requestAnimationFrame(animateScroll);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [mode, selectedCategoryId]);

  const handleLayer1MouseMove = (e: React.MouseEvent) => {
    const { clientX } = e;
    const width = window.innerWidth;
    const zoneSize = width * 0.30; // 30% active zone on each side

    if (clientX < zoneSize) {
      // Left Zone - Scroll Left (negative speed)
      const ratio = 1 - (clientX / zoneSize);
      scrollSpeedRef.current = -1 * ratio * 15; // Max speed 15
    } else if (clientX > width - zoneSize) {
      // Right Zone - Scroll Right (positive speed)
      const ratio = (clientX - (width - zoneSize)) / zoneSize;
      scrollSpeedRef.current = 1 * ratio * 15;
    } else {
      // Dead Zone (Center)
      scrollSpeedRef.current = 0;
    }
  };

  const handleLayer1MouseLeave = () => {
    scrollSpeedRef.current = 0;
  };

  useEffect(() => {
    const loadData = async () => {
      const [cats, its] = await Promise.all([getCategories(), getItems()]);
      setCategories(cats);
      setItems(its);
    };
    loadData();
  }, []);

  const handleUpdateCategories = (newCats: Category[]) => {
    setCategories(newCats);
    saveCategories(newCats);
  };

  const handleUpdateItems = (newItems: Item[]) => {
    setItems(newItems);
    saveItems(newItems);
  };

  const handleCategorySelect = (catId: string) => {
    setSelectedCategoryId(catId);
  };

  const handleItemSelection = (item: Item, rect: DOMRect) => {
    // Stop rumble
    setIsRumbling(false);

    const cat = categories.find(c => c.id === item.categoryId);
    const job: PrintJob = {
      item,
      categoryName: cat?.name || '命運',
      timestamp: new Date().toLocaleString('zh-TW'),
      queueNumber: Math.floor(Math.random() * 1000) + 1
    };
    setActivePrintJob(job);
    setMode('USER_PRINTING');
  };

  // Get Selected Category Object
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const catItems = items.filter(i => i.categoryId === selectedCategoryId);

  // --- Renderers ---

  return (
    <div className="font-sans h-screen w-screen overflow-hidden bg-slate-950 text-white relative">
      
      {/* Background Environment */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none"></div>
      
      {/* Admin Button */}
      {mode === 'USER_HOME' && !selectedCategoryId && (
        <motion.button 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => setMode('ADMIN')} 
          className="absolute top-6 right-6 z-50 p-3 rounded-full text-white/20 hover:text-amber-400 transition-colors"
        >
          <Settings size={20} />
        </motion.button>
      )}

      {/* Mode Switcher */}
      <AnimatePresence mode="wait">
        
        {/* 1. ADMIN PANEL */}
        {mode === 'ADMIN' && (
          <motion.div 
            key="admin"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 z-50 bg-slate-50 overflow-y-auto text-slate-900"
          >
             <div className="bg-white border-b p-4 sticky top-0 z-10 flex justify-between shadow-sm">
                <span className="font-bold text-xl">後台管理</span>
                <button onClick={() => setMode('USER_HOME')} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700">離開</button>
             </div>
             <AdminPanel categories={categories} items={items} onUpdateCategories={handleUpdateCategories} onUpdateItems={handleUpdateItems} />
          </motion.div>
        )}

        {/* 2. PRINTING VIEW */}
        {mode === 'USER_PRINTING' && activePrintJob && (
          <motion.div 
             key="print"
             className="absolute inset-0 z-50"
          >
            <TicketView job={activePrintJob} onComplete={() => { setActivePrintJob(null); setMode('USER_HOME'); setSelectedCategoryId(null); }} />
          </motion.div>
        )}

        {/* 3. USER INTERFACE (Layers 1 & 2) */}
        {mode === 'USER_HOME' && (
          <div className="absolute inset-0 flex flex-col">
            
            {/* Header */}
            {!selectedCategoryId && (
              <motion.header 
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-10 z-10 relative"
              >
                <h1 className="text-4xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 tracking-[0.3em] uppercase drop-shadow-lg">
                  奧秘 ARCANA
                </h1>
                <p className="text-slate-500 text-xs tracking-[0.6em] mt-2 uppercase">選擇你的命運</p>
              </motion.header>
            )}

            {/* Content Area */}
            <div className="flex-1 relative w-full h-full">
              <AnimatePresence>
                
                {/* LAYER 1: CARD DECK (Auto-Scrolling) */}
                {!selectedCategoryId && (
                  <motion.div 
                    ref={scrollContainerRef}
                    onMouseMove={handleLayer1MouseMove}
                    onMouseLeave={handleLayer1MouseLeave}
                    className="absolute inset-0 flex items-center overflow-x-auto no-scrollbar px-20 pb-20 pt-10"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                     <div className="flex items-center space-x-[-60px] min-w-max mx-auto px-20">
                        {categories.map((cat, idx) => (
                          <motion.div
                            key={cat.id}
                            layoutId={cat.id} // SHARED ELEMENT ID
                            onClick={() => handleCategorySelect(cat.id)}
                            className={`
                              relative w-[300px] h-[450px] rounded-3xl flex-shrink-0
                              ${cat.color || 'bg-slate-800'}
                              shadow-2xl border border-white/10 cursor-pointer
                              overflow-hidden origin-bottom
                            `}
                            whileHover={{ 
                              y: -40, 
                              rotate: 0, 
                              zIndex: 10, 
                              scale: 1.05,
                              boxShadow: "0 0 50px rgba(251,191,36,0.3)"
                            }}
                            initial={{ rotate: (idx % 2 === 0 ? 3 : -3) }}
                            whileTap={{ scale: 0.95 }}
                          >
                             {/* Card Content */}
                             <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/90 p-8 flex flex-col justify-end">
                                <motion.div layoutId={`icon-${cat.id}`} className="mb-auto opacity-50">
                                   <Sparkles className="w-10 h-10 text-white" />
                                </motion.div>
                                <motion.h2 layoutId={`title-${cat.id}`} className="text-3xl font-serif font-bold text-white mb-2 uppercase">{cat.name}</motion.h2>
                                <motion.div className="w-full h-px bg-white/20 mb-4" />
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-300 text-sm italic">{cat.description}</motion.p>
                             </motion.div>
                          </motion.div>
                        ))}
                     </div>
                  </motion.div>
                )}

                {/* LAYER 2: IMMERSIVE PAGE */}
                {selectedCategoryId && selectedCategory && (
                  <motion.div
                    layoutId={selectedCategoryId}
                    className={`absolute inset-0 z-40 flex flex-col ${selectedCategory.color || 'bg-slate-800'} overflow-hidden`}
                  >
                    {/* Global Rumble Wrapper - Animates the entire layer when charging */}
                    <motion.div
                      className="absolute inset-0 flex flex-col"
                      animate={isRumbling ? {
                        x: [-3, 3, -2, 2, 0],
                        y: [2, -2, 3, -3, 0],
                        scale: 1.02,
                        filter: "blur(1px)"
                      } : {
                        x: 0, y: 0, scale: 1, filter: "blur(0px)"
                      }}
                      // FIX: Conditional transition to prevent infinite loop on stop
                      transition={isRumbling ? { duration: 0.08, repeat: Infinity } : { duration: 0.3 }}
                    >

                        {/* Background Texture */}
                        <motion.div 
                          initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 0.3 }}
                          className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"
                        />

                        {/* Nav */}
                        <motion.div 
                          className="p-8 flex items-center z-50 relative"
                          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        >
                          <button 
                            onClick={() => setSelectedCategoryId(null)} 
                            className="p-2 bg-black/20 hover:bg-black/40 rounded-full mr-6 backdrop-blur-md border border-white/10"
                          >
                            <ChevronLeft size={24} />
                          </button>
                          <div>
                            <motion.h2 layoutId={`title-${selectedCategory.id}`} className="text-4xl font-serif font-bold text-white uppercase tracking-widest">
                              {selectedCategory.name}
                            </motion.h2>
                          </div>
                        </motion.div>

                            {/* Items Grid (Cosmic Shards) */}
                        <div className="flex-1 overflow-y-auto relative z-40 no-scrollbar pb-20">
                          <div className="flex flex-wrap justify-center items-center min-h-[50vh] gap-8 p-10 max-w-7xl mx-auto">
                              {catItems.map((item, idx) => (
                                <CosmicShard 
                                  key={item.id} 
                                  item={item} 
                                  index={idx}
                                  onLongPress={handleItemSelection} 
                                  onRumble={setIsRumbling}
                                />
                              ))}
                              {catItems.length === 0 && (
                                <div className="text-white/30 text-xl tracking-widest">虛空</div>
                              )}
                          </div>
                        </div>
                    </motion.div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;