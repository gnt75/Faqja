import React, { useState } from 'react';
import { CreditCard, Lock, ShieldCheck, CheckCircle, Loader2 } from 'lucide-react';

interface PaymentGatewayProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: () => void;
  planAmount: string;
}

const PaymentGateway: React.FC<PaymentGatewayProps> = ({ isOpen, onClose, onPaymentComplete, planAmount }) => {
  const [method, setMethod] = useState<'card' | 'paypal'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'input' | 'processing' | 'success'>('input');

  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  if (!isOpen) return null;

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('processing');
    setIsProcessing(true);

    // Simulim i procesimit bankar (3 sekonda)
    setTimeout(() => {
      setStep('success');
      setIsProcessing(false);
      
      // Pas suksesit, prit pak dhe mbyll gjithçka
      setTimeout(() => {
        onPaymentComplete();
      }, 2000);
    }, 3000);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const parts = [];
    for (let i = 0; i < v.length; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
    return parts.length > 1 ? parts.join(' ') : value;
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative animate-in zoom-in-95 duration-300">
        
        {/* Header me vlerën */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Shuma për të paguar</h3>
            <div className="text-3xl font-serif font-bold text-slate-900">{planAmount}</div>
          </div>
          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <ShieldCheck size={14} /> 128-bit SSL Encrypted
          </div>
        </div>

        {step === 'input' && (
          <div className="p-8">
            {/* Payment Method Tabs */}
            <div className="flex gap-4 mb-8">
              <button 
                onClick={() => setMethod('card')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition-all ${method === 'card' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                <CreditCard size={20} /> Kartë Krediti
              </button>
              <button 
                onClick={() => setMethod('paypal')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition-all ${method === 'paypal' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                <span className="italic font-bold text-lg">Pay</span><span className="italic text-lg">Pal</span>
              </button>
            </div>

            {method === 'card' ? (
              <form onSubmit={handlePayment} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Numri i Kartës</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      maxLength={19}
                      placeholder="0000 0000 0000 0000"
                      value={cardData.number}
                      onChange={(e) => setCardData({...cardData, number: formatCardNumber(e.target.value)})}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-mono"
                    />
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Skadenca</label>
                    <input 
                      type="text" 
                      required
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-center"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CVC / CVV</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        placeholder="123"
                        maxLength={3}
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-center"
                      />
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Emri në Kartë</label>
                   <input 
                      type="text" 
                      required
                      placeholder="EMËR MBIEMËR"
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 uppercase"
                    />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-transform transform hover:scale-[1.01] mt-4 flex items-center justify-center gap-2"
                >
                  <Lock size={16} /> Paguaj {planAmount}
                </button>
              </form>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-6">Ju do të ridrejtoheni në PayPal për të përfunduar pagesën e sigurt.</p>
                <button 
                  onClick={handlePayment}
                  className="w-full py-4 bg-[#0070ba] hover:bg-[#003087] text-white font-bold rounded-xl shadow-lg transition-transform transform hover:scale-[1.01]"
                >
                  Vazhdo me PayPal
                </button>
              </div>
            )}
            
            <button onClick={onClose} className="w-full mt-4 text-sm text-slate-400 hover:text-slate-600 font-medium">
              Anullo dhe Kthehu
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="relative mb-6">
               <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <Lock className="text-indigo-600" size={24} />
               </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Duke procesuar pagesën...</h3>
            <p className="text-slate-500">Ju lutem mos e mbyllni dritaren.</p>
          </div>
        )}

        {step === 'success' && (
          <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px] animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle className="text-green-600 w-12 h-12" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-slate-900 mb-2">Pagesa u krye me sukses!</h3>
            <p className="text-slate-600">Abonimi juaj Premium tani është aktiv.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentGateway;