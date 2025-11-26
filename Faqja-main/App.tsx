import React, { useState, useEffect, useRef } from 'react';
import { Scale, Upload, Trash2, Send, FileText, Book, Menu, X, LogOut, Lock, Unlock, Loader2, Crown } from 'lucide-react';
import { DocCategory, StoredFile, Message, UserProfile } from './types';
import { dbService } from './services/dbService';
import { consultLibrarian, consultLawyer } from './services/geminiService';
import ChatMessageBubble from './components/ChatMessageBubble';
import CloudImporter from './components/CloudImporter';
import Login from './components/Login';
import PricingModal from './components/PricingModal';
import AuthModal from './components/AuthModal';
import PaymentGateway from './components/PaymentGateway';
import clsx from 'clsx';

const App = () => {
  // Auth State
  const [user, setUser] = useState<UserProfile | null>(null);

  // App State
  const [caseFiles, setCaseFiles] = useState<StoredFile[]>([]);
  const [lawFiles, setLawFiles] = useState<StoredFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      content: 'Mirë se vini në **Juristi im**. \n\nJu lutem ngarkoni **Dosjet e Çështjes** (kontrata, padi) dhe unë do t\'i analizoj ato bazuar në bazën tonë ligjore.',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [processingStep, setProcessingStep] = useState<string>('');

  // Auto-Download State
  const [isSeeding, setIsSeeding] = useState(false);

  // SECRET ADMIN MODE STATE
  const [adminClicks, setAdminClicks] = useState(0);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // PRICING & AUTH FLOW STATE
  const [usageCount, setUsageCount] = useState(0);
  const [showPricing, setShowPricing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to get current month key (e.g., "2023-11")
  const getCurrentMonthKey = () => {
    const date = new Date();
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  };

  // Initial Load & Auth Check
  useEffect(() => {
    const storedUser = localStorage.getItem('juristi_user');
    
    // Monthly Usage Logic
    const storedUsage = localStorage.getItem('juristi_usage');
    const storedMonth = localStorage.getItem('juristi_last_month');
    const currentMonth = getCurrentMonthKey();

    if (storedMonth !== currentMonth) {
      // New month! Reset usage.
      setUsageCount(0);
      localStorage.setItem('juristi_usage', '0');
      localStorage.setItem('juristi_last_month', currentMonth);
    } else {
      // Same month, load usage
      if (storedUsage) {
        setUsageCount(parseInt(storedUsage));
      }
    }
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      initApp();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initApp = async () => {
      // 1. Force Seed Database (Metadata check)
      await dbService.seedDatabase();

      // 2. Load what we have
      const laws = await dbService.getAllMetadata(DocCategory.LAW_BASE);
      setLawFiles(laws);
      const cases = await dbService.getAllMetadata(DocCategory.CASE_FILE);
      setCaseFiles(cases);
  };

  const handleLoginSuccess = (userData: UserProfile) => {
    setUser(userData);
    localStorage.setItem('juristi_user', JSON.stringify(userData));
    
    // Initialize month tracker on first login if not exists
    if (!localStorage.getItem('juristi_last_month')) {
      localStorage.setItem('juristi_last_month', getCurrentMonthKey());
    }
    
    initApp();
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('juristi_user');
    setCaseFiles([]);
    setLawFiles([]);
    setMessages([{
      id: 'welcome',
      role: 'ai',
      content: 'Mirë se vini në **Juristi im**.',
      timestamp: Date.now()
    }]);
  };

  // Triggered when "Abonohu" is clicked in Pricing Modal
  const handleCheckout = () => {
    if (!user) return;

    if (user.isGuest) {
        // If guest, force registration first. Do NOT open payment yet.
        setShowPricing(false);
        setShowAuthModal(true);
    } else {
        // If already registered, go to payment directly
        setShowPricing(false);
        setShowPayment(true);
    }
  };

  // Triggered after AuthModal completes registration
  const handleRegistrationSuccess = (newUser: UserProfile) => {
    setUser(newUser);
    localStorage.setItem('juristi_user', JSON.stringify(newUser));
    setShowAuthModal(false);
    
    // NDRYSHIM: Nuk hapim pagesën automatikisht.
    // Përdoruesi tani është i regjistruar (Free) dhe mbetet në Dashboard.
    // Ai duhet të klikojë sërish "Upgrade" kur të jetë gati për të paguar.
    
    // Opsionale: Mund të shfaqim një mesazh mirëseardhje
    setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system',
        content: `🎉 Mirë se erdhe **${newUser.name}**! Llogaria juaj u krijua. Për të kaluar në Premium, klikoni butonin "Upgrade Plan" kur të dëshironi.`,
        timestamp: Date.now()
    }]);
  };

  // Triggered by PaymentGateway on success
  const handlePaymentSuccess = () => {
    if (!user) return;
    
    const upgradedUser: UserProfile = { ...user, plan: 'premium' };
    setUser(upgradedUser);
    localStorage.setItem('juristi_user', JSON.stringify(upgradedUser));
    
    setShowPayment(false);
    
    // Add success message to chat
    setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system',
        content: '🎉 **Urime!** Abonimi Premium u aktivizua me sukses. Tani mund të përdorni sistemin pa limite.',
        timestamp: Date.now()
    }]);
  };

  // Secret Admin Trigger
  const handleLogoClick = () => {
    setAdminClicks(prev => {
      const newCount = prev + 1;
      if (newCount === 5) {
        setIsAdminMode(!isAdminMode);
        return 0;
      }
      return newCount;
    });
  };

  const loadFiles = async () => {
    const cases = await dbService.getAllMetadata(DocCategory.CASE_FILE);
    const laws = await dbService.getAllMetadata(DocCategory.LAW_BASE);
    setCaseFiles(cases);
    setLawFiles(laws);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: DocCategory) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await dbService.saveFile(file, category);
      await loadFiles();
    }
  };

  const handleDeleteFile = async (id: string) => {
    await dbService.deleteFile(id);
    await loadFiles();
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    // CHECK USAGE LIMITS
    if (user?.plan !== 'premium' && usageCount >= 2) {
      setShowPricing(true);
      return;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    // Increment usage
    if (user?.plan !== 'premium') {
      const newCount = usageCount + 1;
      setUsageCount(newCount);
      localStorage.setItem('juristi_usage', newCount.toString());
      localStorage.setItem('juristi_last_month', getCurrentMonthKey());
    }

    try {
      setProcessingStep('Duke konsultuar Arkivën Ligjore...');
      const relevantLawIds = await consultLibrarian(userMsg.content, lawFiles);
      const relevantLaws = lawFiles.filter(f => relevantLawIds.includes(f.id));
      
      setProcessingStep(`Duke analizuar çështjen bazuar në ${relevantLaws.length} ligje të gjetura...`);
      const historyText = messages.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n');
      const answer = await consultLawyer(userMsg.content, caseFiles, relevantLaws, historyText);

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: answer,
        timestamp: Date.now(),
        relatedDocs: relevantLawIds
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'ai',
        content: 'Pata një problem gjatë përpunimit të kërkesës suaj. Ju lutem provoni përsëri.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (isSeeding) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 font-sans">
        <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-serif font-bold">Juristi im</h2>
        <p className="text-slate-500 mt-2">Duke shkarkuar Bazën Ligjore të përditësuar...</p>
      </div>
    );
  }

  const FileList = ({ title, files, category, icon: Icon, allowUpload = true, isAdminSection = false }: any) => (
    <div className={clsx("mb-8", isAdminSection ? "bg-slate-900 p-2 rounded-lg border border-indigo-500/30" : "")}>
      <div className="flex items-center justify-between mb-3 px-2">
        <h3 className={clsx("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isAdminSection ? "text-indigo-400" : "text-slate-400")}>
          <Icon size={14} /> {title} {isAdminSection && <Lock size={12} />}
        </h3>
        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">{files.length}</span>
      </div>
      <div className="space-y-2">
        {files.map((file: StoredFile) => (
          <div key={file.id} className="group flex items-center justify-between p-2.5 rounded-md bg-slate-800/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 transition-all">
            <div className="flex items-center gap-3 overflow-hidden">
              <FileText size={16} className="text-slate-500 flex-shrink-0" />
              <span className="text-sm text-slate-300 truncate">{file.name}</span>
            </div>
            <button onClick={() => handleDeleteFile(file.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {files.length === 0 && (
          <div className="text-center py-4 border-2 border-dashed border-slate-800 rounded-md">
            <p className="text-xs text-slate-500">Bosh</p>
          </div>
        )}
        {allowUpload && (
          <div className="mt-3 space-y-2">
            {isAdminSection && <CloudImporter category={category} onImportComplete={loadFiles} />}
            <label className={clsx(
              "flex items-center justify-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors border w-full",
              isAdminSection ? "bg-indigo-900/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-900/40" : "bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700"
            )}>
              <Upload size={14} />
              <span className="text-xs font-medium">Ngarko Manualisht</span>
              <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, category)} accept=".pdf,.txt,.doc,.docx" />
            </label>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} onCheckout={handleCheckout} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onRegister={handleRegistrationSuccess} />
      <PaymentGateway isOpen={showPayment} onClose={() => setShowPayment(false)} onPaymentComplete={handlePaymentSuccess} planAmount="50.00€" />
      
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-md shadow-lg">
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={clsx("fixed md:relative z-40 w-80 h-full bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out", sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")}>
        <div onClick={handleLogoClick} className="p-6 border-b border-slate-800 flex items-center gap-3 cursor-pointer select-none active:opacity-80">
          <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center shadow-lg transition-colors", isAdminMode ? "bg-indigo-600 shadow-indigo-500/20" : "bg-amber-400 shadow-amber-400/20")}>
            {isAdminMode ? <Unlock className="text-white" size={24} /> : <Scale className="text-slate-900" size={24} />}
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-slate-100 tracking-tight">Juristi im</h1>
            <p className={clsx("text-xs", isAdminMode ? "text-indigo-400 font-bold" : "text-slate-500")}>{isAdminMode ? 'ADMIN MODE' : 'SaaS Enterprise'}</p>
          </div>
        </div>
        <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center gap-3">
          <div className="relative">
             <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full border border-slate-600" />
             {user.plan === 'premium' && <div className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 rounded-full p-0.5"><Crown size={10} fill="currentColor" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate flex items-center gap-1">
                {user.name} 
                {user.plan === 'free' && <span className="text-[10px] bg-slate-800 px-1 rounded text-slate-400 uppercase">Free</span>}
                {user.plan === 'premium' && <span className="text-[10px] bg-amber-400/20 text-amber-400 px-1 rounded uppercase font-bold">Pro</span>}
            </p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-red-400"><LogOut size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700">
          {user.plan !== 'premium' && (
              <div className="mb-6 p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-xs text-slate-400 mb-2"><span>Kredite Mujore</span><span>{usageCount}/2</span></div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={clsx("h-full rounded-full transition-all duration-500", usageCount >= 2 ? "bg-red-500" : "bg-amber-400")} style={{ width: `${Math.min((usageCount / 2) * 100, 100)}%` }}></div>
                  </div>
                  {usageCount >= 2 && <button onClick={() => setShowPricing(true)} className="mt-3 w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 rounded transition-colors font-medium">Upgrade to Premium</button>}
              </div>
          )}
          <FileList title="Dosjet e Çështjes" category={DocCategory.CASE_FILE} files={caseFiles} icon={FileText} />
          {isAdminMode && (
            <>
              <div className="my-6 border-t border-slate-800 relative"><span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-950 px-2 text-[10px] text-indigo-500 font-bold">ZONA ADMIN</span></div>
              <FileList title="Baza Ligjore (Hidden)" category={DocCategory.LAW_BASE} files={lawFiles} icon={Book} allowUpload={true} isAdminSection={true} />
            </>
          )}
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <p className="text-xs text-slate-600 text-center">{lawFiles.length > 0 ? `Sistemi ka mësuar ${lawFiles.length} dokumente ligjore.` : "Baza ligjore është bosh."}</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shadow-sm">
          <div className="ml-10 md:ml-0"><h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">Konsultimi {user.plan === 'premium' && <Crown size={16} className="text-amber-500" fill="currentColor"/>}</h2></div>
          <div className="flex items-center gap-4">
             {user.plan !== 'premium' && <button onClick={() => setShowPricing(true)} className="text-xs font-bold text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-full hover:bg-indigo-50 transition-colors">Upgrade Plan</button>}
             <div className="flex items-center gap-2">
                <span className={clsx("w-2 h-2 rounded-full animate-pulse", lawFiles.length > 0 ? "bg-green-500" : "bg-yellow-500")}></span>
                <span className="text-xs font-medium text-slate-500">{lawFiles.length > 0 ? "AI Ready" : "S'ka Ligje"}</span>
             </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
          <div className="max-w-4xl mx-auto">
            {messages.map((msg) => <ChatMessageBubble key={msg.id} message={msg} />)}
            {isProcessing && (
               <div className="flex w-full mb-6 animate-fade-in justify-start">
                 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
                   <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                   <span className="text-sm text-slate-500">{processingStep}</span>
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto relative">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={user.plan !== 'premium' && usageCount >= 2 ? "Keni arritur limitin mujor..." : "Shkruani pyetjen tuaj..."} disabled={user.plan !== 'premium' && usageCount >= 2} className="w-full pl-4 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-slate-700 h-24 md:h-[80px] disabled:opacity-50 disabled:cursor-not-allowed" />
            <button onClick={handleSendMessage} disabled={!input.trim() || isProcessing || (user.plan !== 'premium' && usageCount >= 2)} className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 transition-colors"><Send size={18} /></button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;