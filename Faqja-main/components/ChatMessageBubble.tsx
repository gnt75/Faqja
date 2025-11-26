import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Bot, User, Download } from 'lucide-react';
import { Message } from '../types';
import clsx from 'clsx';

interface ChatMessageBubbleProps {
  message: Message;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const isAI = message.role === 'ai';

  const exportToWord = () => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
    
    // Basic CSS for Word
    const styles = `
      <style>
        body { font-family: 'Calibri', sans-serif; font-size: 11pt; }
        h1, h2, h3 { color: #1e293b; margin-top: 12pt; }
        p { margin-bottom: 8pt; line-height: 1.15; }
        strong { color: #000; font-weight: bold; }
        ul { margin-bottom: 8pt; }
      </style>
    `;

    const content = `
      <h1 style="font-size: 24pt; color: #b45309;">Juristi im - Raport Ligjor</h1>
      <p><strong>Data e Gjenerimit:</strong> ${new Date().toLocaleDateString()}</p>
      <hr style="border-top: 1px solid #ccc;"/>
      <br/>
      <div>${message.content.replace(/\n/g, '<br/>')}</div> 
      <br/>
      <hr/>
      <p style="font-size: 9pt; color: #666;"><em>Ky dokument është gjeneruar nga Asistenti Ligjor AI "Juristi im". Ai nuk përbën këshillë ligjore zyrtare dhe nuk zëvendëson konsultimin me një avokat të licencuar.</em></p>
    `;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(header + styles + content + "</body></html>");
    
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `Raport_Ligjor_${message.id.slice(0, 8)}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  return (
    <div className={clsx(
      "flex w-full mb-6 animate-fade-in group",
      isAI ? "justify-start" : "justify-end"
    )}>
      <div className={clsx(
        "flex max-w-[85%] md:max-w-[80%] rounded-2xl shadow-sm overflow-hidden",
        isAI ? "bg-white border border-slate-200" : "bg-slate-800 text-slate-100"
      )}>
        <div className={clsx(
          "w-12 flex-shrink-0 flex items-start justify-center pt-4",
          isAI ? "bg-slate-50 text-indigo-600" : "bg-slate-900 text-amber-400"
        )}>
          {isAI ? <Bot size={22} /> : <User size={22} />}
        </div>
        
        <div className="p-6 flex-1 min-w-0">
          {isAI && (
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                 <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Konsulent AI</span>
                 <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              
              <button 
                onClick={exportToWord}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                title="Shkarko në Word"
              >
                <Download size={14} />
                <span>Shkarko Raportin (.doc)</span>
              </button>
            </div>
          )}
          
          <div className={clsx(
            "prose prose-sm max-w-none leading-relaxed",
            isAI ? "prose-slate prose-headings:font-serif prose-headings:text-slate-800 prose-p:text-slate-600 prose-strong:text-slate-900" : "prose-invert"
          )}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;