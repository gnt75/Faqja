import React from 'react';
import { Check, X, Crown, Shield } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void; // Changed from onUpgrade to onCheckout
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onCheckout }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 duration-300">
        
        {/* Butoni mbyllës në rast se përdoruesi thjesht do të dalë */}
        <button onClick={onClose} className="absolute top-4 left-4 z-20 text-slate-400 hover:text-slate-600 md:hidden">
          <X size={24} />
        </button>

        {/* Free Plan */}
        <div className="p-8 md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50">
          <h3 className="text-slate-500 font-bold tracking-widest uppercase text-xs mb-2">Plani Aktual</h3>
          <h2 className="text-3xl font-serif font-bold text-slate-800 mb-4">Fillestar</h2>
          <div className="text-5xl font-bold text-slate-900 mb-6">0€<span className="text-lg text-slate-400 font-normal">/përgjithmonë</span></div>
          
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-slate-700 font-medium">
              <Check className="text-green-500" size={20} />
              <span>2 Konsulta Falas / Muaj</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700">
              <Check className="text-green-500" size={20} />
              <span>Akses në Bazën Ligjore</span>
            </li>
            <li className="flex items-center gap-3 text-slate-400 opacity-60">
              <X size={20} />
              <span className="line-through">Eksportim në Word (.doc)</span>
            </li>
            <li className="flex items-center gap-3 text-slate-400 opacity-60">
              <X size={20} />
              <span className="line-through">Konsulta të Pakufizuara</span>
            </li>
          </ul>

          <div className="p-4 bg-slate-200 rounded-xl text-center text-sm text-slate-600">
            Ju keni arritur limitin e përdorimit falas për këtë muaj.
          </div>
        </div>

        {/* Premium Plan */}
        <div className="p-8 md:w-1/2 bg-slate-900 text-white flex flex-col relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 p-4">
             <Crown className="text-amber-400 opacity-20 w-40 h-40 -mr-12 -mt-12 rotate-12" />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-indigo-900/50 to-transparent"></div>

          <h3 className="text-amber-400 font-bold tracking-widest uppercase text-xs mb-2 flex items-center gap-2 relative z-10">
            <Crown size={14} /> Zgjedhja e Profesionistëve
          </h3>
          <h2 className="text-3xl font-serif font-bold text-white mb-4 relative z-10">Premium Pro</h2>
          <div className="text-5xl font-bold text-white mb-6 relative z-10">50€<span className="text-lg text-slate-400 font-normal">/muaj</span></div>
          
          <ul className="space-y-4 mb-8 flex-1 z-10">
            <li className="flex items-center gap-3 text-slate-200">
              <div className="bg-green-500/20 p-1 rounded-full"><Check className="text-green-400" size={14} /></div>
              <span>Konsulta AI të <strong>Pakufizuara</strong></span>
            </li>
            <li className="flex items-center gap-3 text-slate-200">
              <div className="bg-green-500/20 p-1 rounded-full"><Check className="text-green-400" size={14} /></div>
              <span>Shkarkim i Raporteve në <strong>Word (.doc)</strong></span>
            </li>
            <li className="flex items-center gap-3 text-slate-200">
              <div className="bg-green-500/20 p-1 rounded-full"><Check className="text-green-400" size={14} /></div>
              <span>Analizë e Thelluar e Kontratave</span>
            </li>
            <li className="flex items-center gap-3 text-slate-200">
              <div className="bg-green-500/20 p-1 rounded-full"><Check className="text-green-400" size={14} /></div>
              <span>Suport Prioritar 24/7</span>
            </li>
          </ul>

          <button 
            onClick={onCheckout}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 font-bold hover:from-amber-300 hover:to-amber-500 transition-all transform hover:scale-[1.02] shadow-xl shadow-amber-500/20 z-10 relative"
          >
            Abonohu Tani
          </button>
          
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500 z-10">
            <Shield size={12} />
            <span>Pagesë e sigurtë & Anullim në çdo kohë</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;