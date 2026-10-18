import React from 'react';
import { X, Tv, Activity, Sparkles, CheckCircle2 } from 'lucide-react';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-display animate-fade-in">
      <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative text-slate-100 overflow-y-auto max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-wide">COMO JOGAR NA TV POR GESTOS</h2>
            <p className="text-sm text-emerald-400">Tênis sem controle físico: você é a raquete!</p>
          </div>
        </div>

        {/* Step-by-Step TV Motion Guide */}
        <div className="space-y-4 text-sm">
          {/* Step 1 */}
          <div className="flex items-start gap-3.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">Posicionamento na Sala</h3>
              <p className="text-slate-300 leading-relaxed">
                Fique em pé a cerca de <strong className="text-yellow-300">1,5 a 3 metros</strong> da câmera da TV. Certifique-se de que o ambiente tenha uma boa iluminação para a câmera rastrear seu corpo com precisão.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">Correr pela Quadra</h3>
              <p className="text-slate-300 leading-relaxed">
                Dê passos laterais ou <strong className="text-emerald-400">incline o corpo para a esquerda ou direita</strong>. O seu jogador 3D correrá automaticamente pela quadra acompanhando sua posição real!
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">Sacar a Bola</h3>
              <p className="text-slate-300 leading-relaxed">
                Quando for o seu saque, <strong className="text-yellow-300">levante o braço bem alto</strong> para lançar a bola ao ar. Quando a bola atingir o ápice, faça o movimento de golpear para baixo com energia para disparar um Ace!
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0">
              4
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">Rebater (Forehand e Backhand)</h3>
              <p className="text-slate-300 leading-relaxed">
                Faça o movimento real do tênis: balance o braço direito para a frente para bater de <strong className="text-emerald-400">Forehand</strong> ou cruze o corpo para a esquerda para bater de <strong className="text-sky-400">Backhand</strong>. A velocidade do seu braço define a potência do tiro!
              </p>
            </div>
          </div>
        </div>

        {/* Fitness & Fun Banner */}
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-emerald-400" />
            <div className="text-xs">
              <span className="font-bold text-white block">Atividade Física e Diversão</span>
              <span className="text-slate-400">O jogo calcula suas calorias gastas e número de rebatidas em tempo real.</span>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-yellow-400 shrink-0" />
        </div>

        {/* Start Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="w-full md:w-auto px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            ENTENDI, VAMOS JOGAR!
          </button>
        </div>
      </div>
    </div>
  );
};
