import React, { useEffect, useState } from 'react';
import { Category, Item, PrinterSettings, SystemPrinter } from '../types';
import { Plus, Trash2, Edit2, Save, X, AlertTriangle, LayoutGrid, Check, RefreshCw } from 'lucide-react';
import { getPrinterSettings, savePrinterSettings, getSystemPrinters } from '../services/printerService';

interface AdminPanelProps {
  categories: Category[];
  items: Item[];
  onUpdateCategories: (cats: Category[]) => void;
  onUpdateItems: (items: Item[]) => void;
}

// Predefined colors for categories
const CATEGORY_COLORS = [
  'bg-slate-800', 'bg-red-700', 'bg-orange-700', 'bg-amber-700',
  'bg-emerald-800', 'bg-teal-800', 'bg-cyan-800', 'bg-sky-800',
  'bg-blue-800', 'bg-indigo-800', 'bg-violet-800', 'bg-purple-800',
  'bg-fuchsia-800', 'bg-pink-800', 'bg-rose-800'
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  categories,
  items,
  onUpdateCategories,
  onUpdateItems
}) => {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings | null>(null);
  const [isLoadingPrinter, setIsLoadingPrinter] = useState(false);
  const [isSavingPrinter, setIsSavingPrinter] = useState(false);
  const [printerError, setPrinterError] = useState<string | null>(null);
  const [systemPrinters, setSystemPrinters] = useState<SystemPrinter[]>([]);
  const [isLoadingPrintersList, setIsLoadingPrintersList] = useState(false);
  const [activeSection, setActiveSection] = useState<'CONTENT' | 'SETTINGS'>('CONTENT');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const printerEnabled = !!printerSettings?.enabled;
  const activePrinterName = printerSettings?.printerName || '未選擇';

  // --- Category Logic ---
  const handleAddCategory = () => {
    const baseId = Date.now().toString();
    const newCatId = `c-${baseId}`;
    
    // Pick a random color
    const randomColor = CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];

    const newCat: Category = {
      id: newCatId,
      name: '新類別',
      description: '請輸入描述',
      color: randomColor
    };
    const updatedCategories = [...categories, newCat];
    onUpdateCategories(updatedCategories);

    // 同時為新類別建立一個預設的第二層項目
    const newItem: Item = {
      id: `i-${baseId}`,
      categoryId: newCatId,
      title: '新項目',
      content: '在此輸入項目內容...',
      footer: '謝謝惠顧'
    };
    const updatedItems = [...items, newItem];
    onUpdateItems(updatedItems);

    // 自動選取新類別，方便立即編輯其項目
    setSelectedCatId(newCatId);
  };

  // --- Printer Settings Logic ---
  useEffect(() => {
    const loadPrinter = async () => {
      setIsLoadingPrinter(true);
      setPrinterError(null);
      try {
        const [settings, printers] = await Promise.all([
          getPrinterSettings(),
          getSystemPrinters().catch(() => []),
        ]);
        setPrinterSettings(settings);
        setSystemPrinters(printers);

        // 如果尚未設定 printerName，且有預設印表機，就自動帶入
        if (!settings.printerName && printers.length > 0) {
          const def = printers.find(p => p.isDefault) ?? printers[0];
          setPrinterSettings({
            ...settings,
            printerName: def.name,
          });
        }
      } catch (e) {
        console.error(e);
        setPrinterError('無法載入印表機設定');
      } finally {
        setIsLoadingPrinter(false);
      }
    };
    loadPrinter();
  }, []);

  const handleRefreshPrinters = async () => {
    setIsLoadingPrintersList(true);
    setPrinterError(null);
    try {
      const printers = await getSystemPrinters();
      setSystemPrinters(printers);
      if (printerSettings && !printerSettings.printerName && printers.length > 0) {
        const def = printers.find(p => p.isDefault) ?? printers[0];
        setPrinterSettings({
          ...printerSettings,
          printerName: def.name,
        });
      }
    } catch (e) {
      console.error(e);
      setPrinterError('偵測印表機失敗，請確認系統已安裝印表機且後端可存取列印功能（macOS 需有 CUPS / lpstat，Windows 需可使用 PowerShell Get-Printer）。');
    } finally {
      setIsLoadingPrintersList(false);
    }
  };

  const handleSavePrinterSettings = async () => {
    if (!printerSettings) return;
    setIsSavingPrinter(true);
    setPrinterError(null);
    try {
      const saved = await savePrinterSettings(printerSettings);
      setPrinterSettings(saved);
    } catch (e) {
      console.error(e);
      setPrinterError('儲存失敗，請稍後再試');
    } finally {
      setIsSavingPrinter(false);
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('確定要刪除此類別及其所有項目嗎？')) {
      const remainingCategories = categories.filter(c => c.id !== id);
      const remainingItems = items.filter(i => i.categoryId !== id);
      onUpdateCategories(remainingCategories);
      onUpdateItems(remainingItems);
      setSelectedCategoryIds(prev => prev.filter(cid => cid !== id));
      if (selectedCatId === id) setSelectedCatId(null);
    }
  };

  const handleBulkDeleteCategories = () => {
    if (selectedCategoryIds.length === 0) return;
    if (!confirm(`確定要刪除選取的 ${selectedCategoryIds.length} 個類別及其所有項目嗎？`)) return;

    const remainingCategories = categories.filter(c => !selectedCategoryIds.includes(c.id));
    const remainingItems = items.filter(i => !selectedCategoryIds.includes(i.categoryId));
    onUpdateCategories(remainingCategories);
    onUpdateItems(remainingItems);
    setSelectedCategoryIds([]);
    if (selectedCatId && !remainingCategories.find(c => c.id === selectedCatId)) {
      setSelectedCatId(remainingCategories[0]?.id ?? null);
    }
  };

  const handleSaveCategory = () => {
    if (!editingCategory || !editingCategory.id) return;
    const updated = categories.map(c => c.id === editingCategory.id ? { ...c, ...editingCategory } as Category : c);
    onUpdateCategories(updated);
    setEditingCategory(null);
  };

  // --- Item Logic ---
  const handleAddItem = (catId: string) => {
    const newItem: Item = {
      id: Date.now().toString(),
      categoryId: catId,
      title: '新項目',
      content: '在此輸入項目內容...',
      footer: '謝謝惠顧'
    };
    setEditingItem(newItem);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('確定要刪除此項目嗎？')) {
      const remaining = items.filter(i => i.id !== id);
      onUpdateItems(remaining);
      setSelectedItemIds(prev => prev.filter(iid => iid !== id));
    }
  };

  const handleBulkDeleteItems = () => {
    if (selectedItemIds.length === 0) return;
    if (!confirm(`確定要刪除選取的 ${selectedItemIds.length} 個項目嗎？`)) return;
    const remaining = items.filter(i => !selectedItemIds.includes(i.id));
    onUpdateItems(remaining);
    setSelectedItemIds([]);
  };

  const handleSaveItem = () => {
    if (!editingItem || !editingItem.id) return;
    
    const exists = items.find(i => i.id === editingItem.id);
    let updatedItems;
    if (exists) {
      updatedItems = items.map(i => i.id === editingItem.id ? { ...i, ...editingItem } as Item : i);
    } else {
      updatedItems = [...items, editingItem as Item];
    }
    onUpdateItems(updatedItems);
    setEditingItem(null);
  };

  // --- Render ---
  return (
    <div className="p-6 max-w-6xl mx-auto font-sans">

      {/* Top tabs */}
      <div className="mb-6 border-b border-slate-200 flex gap-4">
        <button
          type="button"
          onClick={() => setActiveSection('CONTENT')}
          className={`px-3 pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeSection === 'CONTENT'
              ? 'border-slate-800 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          內容管理
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('SETTINGS')}
          className={`px-3 pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeSection === 'SETTINGS'
              ? 'border-slate-800 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          系統設定
        </button>
      </div>
      
      {/* Section: 內容管理 */}
      {activeSection === 'CONTENT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          
          {/* Left Sidebar: Categories (4 columns) */}
          <div className="lg:col-span-4 flex flex-col gap-4 h-full">
            
            {/* Category Header & Toolbar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                      <LayoutGrid size={20} />
                      類別管理
                  </h3>
                  <button 
                      onClick={handleAddCategory}
                      className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-md shadow-slate-200"
                      title="新增類別"
                  >
                      <Plus size={18} />
                  </button>
              </div>
              
              {/* Bulk Action Bar for Categories */}
              {selectedCategoryIds.length > 0 && (
                  <div className="flex items-center justify-between bg-red-50 px-3 py-2 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-1">
                      <span className="text-xs font-medium text-red-600">已選 {selectedCategoryIds.length} 項</span>
                      <button
                          onClick={handleBulkDeleteCategories}
                          className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1 rounded-md shadow-sm hover:bg-red-50 hover:border-red-300 transition-all flex items-center gap-1"
                      >
                          <Trash2 size={12} /> 批量刪除
                      </button>
                  </div>
              )}
            </div>

            {/* Category List (Scrollable) */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {categories.map(cat => (
                  <div 
                      key={cat.id}
                      onClick={() => setSelectedCatId(cat.id)}
                      className={`
                          group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer
                          hover:shadow-md hover:border-slate-300
                          ${selectedCatId === cat.id 
                              ? 'bg-white border-slate-800 ring-1 ring-slate-800 shadow-md' 
                              : 'bg-white border-slate-200 text-slate-600'
                          }
                      `}
                  >
                      <div className="flex items-start gap-3">
                          {/* Checkbox (Stop propagation) */}
                          <div className="pt-1" onClick={e => e.stopPropagation()}>
                              <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                  checked={selectedCategoryIds.includes(cat.id)}
                                  onChange={e => {
                                      setSelectedCategoryIds(prev =>
                                          e.target.checked ? [...prev, cat.id] : prev.filter(id => id !== cat.id)
                                      );
                                  }}
                              />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-base truncate">{cat.name}</span>
                                  {/* Color Dot */}
                                  <span className={`w-3 h-3 rounded-full ${cat.color} border border-black/10`} />
                              </div>
                              <p className="text-xs opacity-70 truncate mb-3">{cat.description || '無描述'}</p>
                              
                              {/* Actions (Only visible on hover or active) */}
                              <div className={`flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity ${selectedCatId === cat.id ? 'opacity-100' : ''}`}>
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); }}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                      title="編輯"
                                  >
                                      <Edit2 size={14} />
                                  </button>
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                      title="刪除"
                                  >
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              ))}
              {/* Add Category Placeholder if empty */}
              {categories.length === 0 && (
                  <div 
                      onClick={handleAddCategory}
                      className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-slate-300 hover:text-slate-500 transition-colors"
                  >
                      <Plus size={32} className="mb-2 opacity-50" />
                      <span className="text-sm font-medium">點擊新增第一個類別</span>
                  </div>
              )}
            </div>
          </div>

          {/* Right Main Content: Items (8 columns) */}
          <div className="lg:col-span-8 flex flex-col h-full bg-slate-50/50 rounded-3xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                  <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-800">
                          {selectedCatId 
                              ? categories.find(c => c.id === selectedCatId)?.name 
                              : '所有項目'}
                      </h3>
                      <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                          {items.filter(i => selectedCatId ? i.categoryId === selectedCatId : true).length} 項目
                      </span>
                  </div>

                  <div className="flex gap-3">
                      {selectedItemIds.length > 0 && (
                          <button
                              onClick={handleBulkDeleteItems}
                              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                          >
                              <Trash2 size={16} />
                              刪除 {selectedItemIds.length} 項
                          </button>
                      )}
                      {selectedCatId && (
                          <button 
                              onClick={() => handleAddItem(selectedCatId)} 
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-200 hover:bg-emerald-700 hover:shadow-lg transition-all"
                          >
                              <Plus size={18} />
                              新增項目
                          </button>
                      )}
                  </div>
              </div>

              {/* Content Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                  {!selectedCatId ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300">
                          <LayoutGrid size={64} className="mb-4 opacity-20" />
                          <p className="text-lg font-medium">請從左側選擇一個類別</p>
                          <p className="text-sm">或是新增類別以開始</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {items.filter(i => i.categoryId === selectedCatId).map(item => (
                              <div 
                                  key={item.id} 
                                  className={`
                                      group relative bg-white rounded-xl border p-5 flex flex-col gap-3 transition-all duration-200
                                      hover:shadow-lg hover:-translate-y-1 hover:border-slate-300
                                      ${selectedItemIds.includes(item.id) ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'border-slate-100'}
                                  `}
                              >
                                  {/* Header: Title & Checkbox */}
                                  <div className="flex justify-between items-start gap-2">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <input
                                              type="checkbox"
                                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                                              checked={selectedItemIds.includes(item.id)}
                                              onChange={e =>
                                                  setSelectedItemIds(prev =>
                                                      e.target.checked ? [...prev, item.id] : prev.filter(id => id !== item.id)
                                                  )
                                              }
                                          />
                                          <div className="min-w-0">
                                              <h4 className="font-bold text-slate-800 truncate" title={item.title}>{item.title}</h4>
                                              {item.subtitle && <p className="text-xs text-slate-400 truncate font-serif italic">{item.subtitle}</p>}
                                          </div>
                                      </div>
                                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                              onClick={() => setEditingItem(item)}
                                              className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-full transition-colors"
                                          >
                                              <Edit2 size={14} />
                                          </button>
                                      </div>
                                  </div>

                                  {/* Content Body */}
                                  <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                      <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed font-mono text-justify">
                                          {item.content}
                                      </p>
                                  </div>

                                  {/* Footer */}
                                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-50">
                                      <span className="font-medium truncate max-w-[60%]">{item.footer || '---'}</span>
                                      {/* Removed Price display */}
                                  </div>
                              </div>
                          ))}
                          
                          {/* Add Item Card (Placeholder style) */}
                          <button 
                              onClick={() => handleAddItem(selectedCatId)}
                              className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all min-h-[200px]"
                          >
                              <Plus size={32} className="mb-2" />
                              <span className="font-medium text-sm">新增項目</span>
                          </button>
                      </div>
                  )}
              </div>
          </div>
        </div>
      )}

      {/* Section: 系統設定（印表機等） */}
      {activeSection === 'SETTINGS' && (
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-700">列印與裝置設定</h3>
                <p className="text-xs text-slate-400 mt-1">
                  控制是否送出實體列印、指定系統印表機佇列與張數。關閉時僅顯示票券動畫，不會送出列印工作。
                </p>
              </div>
              {printerSettings && (
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      printerEnabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`mr-1 h-1.5 w-1.5 rounded-full ${
                        printerEnabled ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {printerEnabled ? '實體列印：已啟用' : '實體列印：已關閉'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    目前印表機：{activePrinterName}
                  </span>
                </div>
              )}
            </div>

          {printerError && (
            <div className="mb-3 text-sm text-red-600">
              {printerError}
            </div>
          )}
            {isLoadingPrinter && (
              <div className="text-sm text-slate-500">載入中...</div>
            )}
            {printerSettings && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={printerSettings.enabled}
                      onChange={e =>
                        setPrinterSettings({
                          ...printerSettings,
                          enabled: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm text-slate-700">啟用實體列印</span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    {printerEnabled
                      ? '列印工作會立即送往選定印表機。請確認印表機已開機且有紙卷。'
                      : '關閉後只顯示票券畫面，不會送出任何列印工作。'}
                  </p>
                </div>

                <div
                  className={`flex flex-col md:flex-row md:items-end gap-4 rounded-lg border p-4 ${
                    printerEnabled ? 'border-slate-200 bg-slate-50/60' : 'border-dashed border-slate-200 bg-slate-50/40 opacity-70'
                  }`}
                >
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      印表機名稱（系統佇列名稱）
                    </label>
                    <div className="flex flex-col md:flex-row gap-2">
                      <select
                        className="w-full md:flex-1 p-2 border rounded bg-slate-50 disabled:bg-slate-100"
                        value={printerSettings.printerName}
                        onChange={e =>
                          setPrinterSettings({
                            ...printerSettings,
                            printerName: e.target.value,
                          })
                        }
                        disabled={!printerEnabled}
                      >
                        <option value="">請選擇或手動輸入</option>
                        {systemPrinters.map(p => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                            {p.isDefault ? '（預設）' : ''}
                            {p.status ? ` - ${p.status}` : ''}
                          </option>
                        ))}
                      </select>
                      <input
                        className="w-full md:w-1/2 p-2 border rounded bg-slate-50 disabled:bg-slate-100"
                        value={printerSettings.printerName}
                        onChange={e =>
                          setPrinterSettings({
                            ...printerSettings,
                            printerName: e.target.value,
                          })
                        }
                        placeholder="自訂或覆寫印表機名稱"
                        disabled={!printerEnabled}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      名稱需與作業系統中設定的印表機佇列名稱相同，例如：macOS 可用 `lpstat -p` 或系統設定檢視，Windows 可在 PowerShell `Get-Printer` 中查看。
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      每次列印張數
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="w-24 p-2 border rounded bg-slate-50 disabled:bg-slate-100"
                      value={printerSettings.copies}
                      onChange={e =>
                        setPrinterSettings({
                          ...printerSettings,
                          copies: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      disabled={!printerEnabled}
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      例如：熱感紙機一次吐出 2 張票。
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      紙張寬度（mm）
                    </label>
                    <select
                      className="w-40 p-2 border rounded bg-slate-50 disabled:bg-slate-100"
                      value={String(printerSettings.paperWidthMm)}
                      onChange={e =>
                        setPrinterSettings({
                          ...printerSettings,
                          paperWidthMm: Number(e.target.value) || 80,
                        })
                      }
                      disabled={!printerEnabled}
                    >
                      <option value="80">80（票籤設計：80×170mm）</option>
                      <option value="58">58（較窄熱感紙）</option>
                    </select>
                    <p className="mt-1 text-[11px] text-slate-400">
                      目前票籤版型高度固定為 170mm；僅支援熱感紙寬度 58/80。
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleSavePrinterSettings}
                    disabled={isSavingPrinter}
                    className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-60"
                  >
                    {isSavingPrinter ? '儲存中...' : '儲存印表機設定'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRefreshPrinters}
                    disabled={isLoadingPrintersList}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-60"
                  >
                    {isLoadingPrintersList ? '偵測中...' : '重新偵測系統印表機'}
                  </button>
                  <span className="text-[11px] text-slate-400">
                    偵測需要系統已正確安裝印表機且裝置已開機連線（macOS：CUPS / lpstat；Windows：PowerShell Get-Printer）。
                  </span>
                </div>

                {systemPrinters.length === 0 && (
                  <div className="mt-2 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <div>目前系統未偵測到任何印表機。</div>
                      <div className="mt-0.5">
                        請先在作業系統的「印表機與掃描器」設定中加入印表機（macOS / Windows 皆可），並確認列印服務已啟動，然後點擊「重新偵測系統印表機」。
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg border border-slate-100 scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold mb-6 text-slate-800">編輯類別</h3>
            <div className="space-y-6">
              <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">類別名稱</label>
                  <input 
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all outline-none" 
                    placeholder="例如：愛情神諭" 
                    value={editingCategory.name || ''} 
                    onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                  />
              </div>
              
              <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">描述</label>
                  <input 
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all outline-none" 
                    placeholder="例如：心靈與靈魂的連結" 
                    value={editingCategory.description || ''} 
                    onChange={e => setEditingCategory({...editingCategory, description: e.target.value})}
                  />
              </div>

              <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">主題顏色</label>
                  <div className="grid grid-cols-5 gap-3">
                    {CATEGORY_COLORS.map(color => (
                        <button
                            key={color}
                            onClick={() => setEditingCategory({...editingCategory, color})}
                            className={`
                                h-10 w-full rounded-lg transition-all duration-200 flex items-center justify-center
                                ${color} 
                                ${editingCategory.color === color ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-md' : 'hover:scale-105 hover:shadow-sm opacity-80 hover:opacity-100'}
                            `}
                        >
                            {editingCategory.color === color && <Check className="text-white w-5 h-5 drop-shadow-sm" />}
                        </button>
                    ))}
                  </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
              <button 
                  onClick={() => setEditingCategory(null)} 
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                  取消
              </button>
              <button 
                  onClick={handleSaveCategory} 
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium shadow-md hover:shadow-lg transition-all"
              >
                  儲存變更
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl p-0 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white">
               <h3 className="text-xl font-bold text-slate-800">編輯項目內容</h3>
               <button 
                   onClick={() => setEditingItem(null)}
                   className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
               >
                   <X size={20} />
               </button>
            </div>
            
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2">
              
              {/* Left Column: Form */}
              <div className="p-6 overflow-y-auto space-y-5 bg-white">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">標題</label>
                  <input 
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                    value={editingItem.title || ''} 
                    onChange={e => setEditingItem({...editingItem, title: e.target.value})}
                    placeholder="票券標題"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">副標題</label>
                  <input 
                      className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                      placeholder="簡短的描述"
                      value={editingItem.subtitle || ''} 
                      onChange={e => setEditingItem({...editingItem, subtitle: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">主要內容 (票券內文)</label>
                  <textarea 
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 h-40 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-none" 
                    value={editingItem.content || ''} 
                    onChange={e => setEditingItem({...editingItem, content: e.target.value})}
                    placeholder="請輸入詳細內容..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">頁尾文字</label>
                  <input 
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                    value={editingItem.footer || ''} 
                    onChange={e => setEditingItem({...editingItem, footer: e.target.value})}
                    placeholder="例如：保持智慧"
                  />
                </div>
              </div>

              {/* Right Column: Preview */}
              <div className="bg-slate-100 p-8 flex flex-col items-center justify-center border-l border-slate-200">
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">LIVE PREVIEW</p>
                 
                 {/* Ticket Preview Component */}
                 <div className="bg-white p-6 shadow-xl w-[260px] text-center font-mono text-sm border-t-8 border-slate-800 min-h-[440px] flex flex-col relative">
                   {/* Paper texture effect overlay */}
                   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-dust.png')] opacity-30 pointer-events-none"></div>
                   
                   <div className="relative z-10 flex flex-col h-full">
                       <div className="font-bold text-xl mb-2 mt-2">{editingItem.title || '標題'}</div>
                       <div className="text-xs mb-6 border-b border-dashed border-slate-300 pb-3 italic text-slate-500">
                           {editingItem.subtitle || '副標題'}
                       </div>
                       
                       <div className="whitespace-pre-wrap text-left mb-6 text-xs leading-relaxed flex-1 text-slate-700">
                         {editingItem.content || '這裡會顯示票券的主要內容。您可以在左側編輯文字，這裡會即時更新...'}
                       </div>
                       
                       <div className="mt-auto pt-4 border-t border-slate-800 text-xs font-bold uppercase tracking-wide">
                           {editingItem.footer || '頁尾文字'}
                       </div>
                       
                       <div className="mt-4 text-[10px] text-slate-300">
                           NTUB B-KIOSK
                       </div>
                   </div>
                 </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50">
              <button 
                  onClick={() => setEditingItem(null)} 
                  className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                  取消
              </button>
              <button 
                  onClick={handleSaveItem} 
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md shadow-blue-200 hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Save size={18} /> 儲存項目
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
