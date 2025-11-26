import React from 'react';
import { Scale, ShieldCheck, ArrowRight, FileText, BookOpen, Gavel, Zap, Lock, CheckCircle, BrainCircuit } from 'lucide-react';
import { UserProfile } from '../types';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  
  const handleEnter = () => {
    // Hyrje direkte si përdorues standard (Falas/Vizitor)
    const user: UserProfile = {
      name: "Vizitor",
      email: "guest@juristi.im",
      picture: "https://ui-avatars.com/api/?name=Guest&background=fbbf24&color=1e293b",
      plan: 'free', 
      isGuest: true 
    };
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-amber-400 p-1.5 rounded-lg">
                <Scale className="text-slate-900 h-5 w-5" />
              </div>
              <span className="text-xl font-serif font-bold text-slate-100">Juristi Im</span>
            </div>
            <button 
              onClick={handleEnter}
              className="bg-slate-800 hover:bg-slate-700 text-amber-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Hyr në Platformë
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden z-0 pointer-events-none">
           <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-indigo-900/30 rounded-full blur-[100px]"></div>
           <div className="absolute bottom-[20%] right-[20%] w-[500px] h-[500px] bg-amber-900/20 rounded-full blur-[100px]"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-4 animate-fade-in">
             <BrainCircuit size={14} />
             <span>Fuqizuar nga Inteligjenca Artificiale</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight text-white leading-tight">
            Inteligjencë Artificiale për <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-600">Analiza Ligjore të Sakta</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Mos shpenzoni orë të tëra duke lexuar dokumente të ndërlikuara. 
            <strong className="text-slate-200"> Juristi Im</strong> ju ofron analiza të menjëhershme dhe të besueshme në sekonda.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={handleEnter}
              className="w-full sm:w-auto px-8 py-4 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold rounded-xl shadow-lg shadow-amber-400/20 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <span>Provo Falas</span>
              <ArrowRight size={20} />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-colors">
              Si funksionon?
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-24 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold text-white mb-4">Çfarë mund të bëni me Juristi Im?</h2>
            <p className="text-slate-400">Një asistent ligjor personal në dispozicionin tuaj 24/7.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<FileText className="w-8 h-8 text-indigo-400" />}
              title="Analizë Kontratash"
              desc="Analizoni kontrata biznesi dhe marrëveshje personale për të gjetur klauzola të rrezikshme."
            />
            <FeatureCard 
              icon={<BookOpen className="w-8 h-8 text-amber-400" />}
              title="Kuptoni Ligjet"
              desc="Kuptoni ligje dhe rregullore komplekse pa mundim, të shpjeguara thjeshtë."
            />
            <FeatureCard 
              icon={<Gavel className="w-8 h-8 text-indigo-400" />}
              title="Dokumente Gjyqësore"
              desc="Nxirrni pikat kryesore nga padi dhe vendime gjyqësore në sekonda."
            />
            <FeatureCard 
              icon={<Zap className="w-8 h-8 text-amber-400" />}
              title="Vendime të Shpejta"
              desc="Merrni vendime të informuara ligjore, më shpejt se kurrë më parë."
            />
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="py-24 bg-slate-950 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-8">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">
                Pse të na besoni? <br/>
                <span className="text-slate-500">Siguri dhe saktësi maksimale.</span>
              </h2>
              
              <div className="space-y-6">
                <TrustItem 
                  title="Saktësi Profesionale" 
                  desc="Çdo analizë mbështetet në teknologji të avancuar RAG (Retrieval-Augmented Generation)." 
                />
                <TrustItem 
                  title="Shpejtësi" 
                  desc="Merrni përgjigje të qarta dhe të detajuara në vetëm pak sekonda." 
                />
                <TrustItem 
                  title="Thjeshtësi" 
                  desc="Platformë e lehtë për t’u përdorur, pa nevojë për njohuri teknike." 
                />
                <TrustItem 
                  title="Siguri e Garantuar" 
                  desc="Të dhënat tuaja janë të enkriptuara dhe mbeten plotësisht konfidenciale." 
                />
              </div>
            </div>
            
            <div className="lg:w-1/2">
              <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <div className="absolute -top-4 -right-4 bg-amber-500 text-slate-900 p-3 rounded-xl shadow-lg">
                  <ShieldCheck size={32} />
                </div>
                <div className="space-y-4">
                  <div className="h-2 w-24 bg-slate-800 rounded-full"></div>
                  <div className="h-8 w-3/4 bg-slate-800 rounded-lg"></div>
                  <div className="space-y-2 pt-4">
                    <div className="h-2 w-full bg-slate-800 rounded-full"></div>
                    <div className="h-2 w-full bg-slate-800 rounded-full"></div>
                    <div className="h-2 w-5/6 bg-slate-800 rounded-full"></div>
                  </div>
                  <div className="pt-8 flex justify-end">
                     <button onClick={handleEnter} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg">Analizo Dokumentin</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            
            <h2 className="text-3xl font-bold text-white mb-6 relative z-10">Gati për të filluar?</h2>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto relative z-10">
              Provojeni Juristi Im sot dhe merrni siguri ligjore në sekonda. Nuk kërkohet kartë krediti për të filluar.
            </p>
            
            <button 
              onClick={handleEnter}
              className="relative z-10 px-8 py-4 bg-white text-indigo-900 font-bold rounded-xl hover:bg-slate-100 transition-colors shadow-lg"
            >
              Provo Falas Tani
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-slate-600 text-sm">
        <p>&copy; {new Date().getFullYear()} Juristi Im. Të gjitha të drejtat e rezervuara.</p>
      </footer>

    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-colors group">
    <div className="mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
    <h3 className="text-xl font-bold text-slate-200 mb-2">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

const TrustItem = ({ title, desc }: { title: string, desc: string }) => (
  <div className="flex gap-4">
    <div className="mt-1 bg-slate-900 p-2 rounded-lg h-fit border border-slate-800">
       <CheckCircle className="text-amber-500 w-5 h-5" />
    </div>
    <div>
      <h3 className="text-lg font-bold text-slate-200">{title}</h3>
      <p className="text-slate-400 text-sm mt-1">{desc}</p>
    </div>
  </div>
);

export default Login;