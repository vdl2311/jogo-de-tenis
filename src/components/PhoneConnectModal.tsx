import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, Wifi, CheckCircle, HelpCircle } from 'lucide-react';

interface PhoneConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const PhoneConnectModal: React.FC<PhoneConnectModalProps> = ({ isOpen, onClose, roomCode }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Generate mobile controller URL pointing to current app URL + ?room=ROOMCODE
  const controllerUrl = `${window.location.origin}/?room=${roomCode}&mode=phone`;

  const copyLink = () => {
    navigator.clipboard.writeText(controllerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-display animate-fade-in">
      <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl text-slate-100 relative text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4">
          <Smartphone className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-wide mb-1">USE O CELULAR COMO RAQUETE</h2>
        <p className="text-xs text-emerald-400 mb-6">Aponte a câmera do seu smartphone para o QR Code abaixo</p>

        {/* QR Code Container */}
        <div className="bg-white p-4 rounded-3xl inline-block shadow-xl mb-4 border-4 border-slate-800">
          <QRCodeSVG value={controllerUrl} size={192} level="H" includeMargin={true} />
        </div>

        {/* Room Code Display */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 mb-6">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">CÓDIGO DA SALA NA TV</div>
          <div className="text-3xl font-black text-yellow-300 tracking-widest glow-neon-yellow">{roomCode}</div>
        </div>

        {/* Copy Link Button */}
        <button
          onClick={copyLink}
          className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer mb-3"
        >
          {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
          {copied ? 'LINK COPIADO!' : 'COPIAR LINK DO CELULAR'}
        </button>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Você também pode jogar usando a câmera frontal do computador ou o teclado.
        </p>
      </div>
    </div>
  );
};
