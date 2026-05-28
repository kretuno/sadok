import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { AlertCircle, Printer, RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../ui/Modal';

interface ChildQRCodeProps {
  childId: number;
  qrToken?: string;
  childName: string;
  onRegenerate: () => void;
}

const ChildQRCode: React.FC<ChildQRCodeProps> = ({ childId, qrToken, childName, onRegenerate }) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handlePrint = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    const imgData = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Друк QR-коду: ${childName}</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              font-family: 'Montserrat', sans-serif;
              margin: 0;
            }
            .container {
              border: 1px solid #eee;
              padding: 20px;
              text-align: center;
              border-radius: 10px;
            }
            img { width: 150px; height: 150px; }
            h2 { font-size: 14px; margin-top: 10px; color: #333; }
            p { font-size: 10px; color: #999; margin: 0; }
            @media print {
              .no-print { display: none; }
              body { height: auto; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="container">
            <img src="${imgData}" />
            <h2>${childName}</h2>
            <p>SADOK: Особова справа</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleRegenerate = async () => {
    const isNew = !qrToken;
    if (!isNew) {
      setIsConfirmOpen(true);
      return;
    }

    await regenerateQr();
  };

  const regenerateQr = async () => {
    setError(null);
    try {
      await api.post(`/children/${childId}/regenerate-qr`);
      setIsConfirmOpen(false);
      onRegenerate();
    } catch (err: any) {
      console.error('Failed to regenerate QR', err);
      const message = err.response?.data?.message || 'Помилка мережі або сервера';
      setError(`Помилка генерації коду: ${message}`);
    }
  };

  // Format: sadok://child/{token}
  const qrValue = `sadok://child/${qrToken || 'no-token'}`;

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">QR-код особової справи</div>

      {error && (
        <div className="mb-4 flex w-full items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      
      <div ref={qrRef} className="p-4 bg-gray-50 rounded-3xl border border-gray-100 mb-4">
        {qrToken ? (
          <div className="flex flex-col items-center">
            <QRCodeCanvas 
              value={qrValue} 
              size={160}
              level="H"
              includeMargin={false}
            />
            <div className="mt-4 px-3 py-1 bg-gray-100 rounded-full flex items-center gap-2">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">ID: {qrToken.split('-')[0]}...{qrToken.slice(-4)}</span>
            </div>
          </div>
        ) : (
          <div className="w-[160px] h-[160px] flex flex-col items-center justify-center text-gray-400 italic text-center p-4">
            <div className="text-xs mb-3">Код ще не згенеровано для цієї дитини</div>
            <button 
              onClick={handleRegenerate}
              className="text-[10px] font-black bg-warm-100 text-warm-700 px-3 py-2 rounded-xl hover:bg-warm-200 transition-all uppercase tracking-tighter"
            >
              Згенерувати зараз
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 w-full">
        <button 
          onClick={handlePrint}
          disabled={!qrToken}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-emerald-200 disabled:opacity-50"
        >
          <Printer size={18} />
          ДРУК КОДУ
        </button>
        <button 
          onClick={handleRegenerate}
          className="p-3 bg-white border-2 border-gray-100 hover:border-warm-200 text-gray-400 hover:text-warm-500 rounded-2xl transition-all"
          title="Сформувати новий код"
        >
          <RefreshCw size={18} />
        </button>
      </div>
      
      <p className="mt-4 text-[10px] text-gray-400 text-center leading-tight max-w-[180px]">
        Це спеціальний токен <span className="text-warm-600 font-bold">sadok://</span> для майбутнього додатка. Звичайні сканери можуть його не розпізнати як веб-посилання.
      </p>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Зміна QR-коду"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            Змінити QR-код для {childName}? Старий код перестане працювати.
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              className="rounded-xl px-6 py-2 font-bold text-gray-600 hover:bg-gray-100"
            >
              Скасувати
            </button>
            <button
              type="button"
              onClick={() => void regenerateQr()}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2 font-bold text-white transition hover:bg-amber-700"
            >
              <RefreshCw size={18} />
              Змінити код
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChildQRCode;
