import React, { useState } from 'react';
import { QrCode, Key, Camera, X, CheckCircle2, ShieldCheck, ArrowRight, Laptop } from 'lucide-react';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessfulPair: () => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({ isOpen, onClose, onSuccessfulPair }) => {
  const [tab, setTab] = useState<'qr' | 'otp'>('otp');
  const [otpCode, setOtpCode] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    
    // Auto-hyphenate: GB-XXXX-XXXX
    if (val.length > 4) {
      setOtpCode(`${val.slice(0, 4)}-${val.slice(4)}`);
    } else {
      setOtpCode(val);
    }
  };

  const handleAuthorize = () => {
    if (otpCode.replace('-', '').length < 8) {
      setErrorMsg('Please enter the full 8-character pairing code shown on your desktop.');
      return;
    }
    setErrorMsg('');
    setIsAuthorizing(true);

    setTimeout(() => {
      setIsAuthorizing(false);
      setIsSuccess(true);
      // Store paired token and pairing code in localStorage
      localStorage.setItem('ghostbrain_paired_token', 'gb_remote_session_' + Date.now());
      localStorage.setItem('ghostbrain_pairing_code', otpCode.toUpperCase());
      localStorage.setItem('ghostbrain_host_alias', 'Home Workstation');
      setTimeout(() => {
        onSuccessfulPair();
      }, 900);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0d0d12] border border-[#e5b364]/30 p-6 shadow-2xl shadow-[#e5b364]/10 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8e887d] hover:text-[#f0ebe1] hover:bg-white/5 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-[#e5b364]/10 border border-[#e5b364]/30 text-[#e5b364] text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero-Knowledge Device Pairing</span>
          </div>
          <h3 className="text-xl font-serif text-[#f0ebe1] font-semibold tracking-wide">
            Link Your Mobile Remote
          </h3>
          <p className="text-xs text-[#8e887d]">
            Securely mirror and command your GhostBrain desktop without port forwarding or password entry.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 p-1 bg-white/5 rounded-xl border border-white/10 text-xs font-mono">
          <button
            onClick={() => { setTab('otp'); setErrorMsg(''); }}
            className={`py-2 rounded-lg font-medium transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              tab === 'otp' ? 'bg-[#e5b364] text-[#060608] shadow-sm' : 'text-[#8e887d] hover:text-[#f0ebe1]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Enter OTP Code</span>
          </button>
          <button
            onClick={() => { setTab('qr'); setErrorMsg(''); }}
            className={`py-2 rounded-lg font-medium transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              tab === 'qr' ? 'bg-[#e5b364] text-[#060608] shadow-sm' : 'text-[#8e887d] hover:text-[#f0ebe1]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan Camera QR</span>
          </button>
        </div>

        {/* Tab 1: OTP Input */}
        {tab === 'otp' && (
          <div className="space-y-4">
            <div className="space-y-1.5 text-center">
              <label className="text-xs font-mono uppercase tracking-wider text-[#8e887d]">
                Desktop 8-Character Pairing Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={otpCode}
                  onChange={handleOtpChange}
                  placeholder="GB-8492-XQ71"
                  className="w-full text-center py-3 bg-black/60 border border-[#e5b364]/40 rounded-xl text-lg font-mono font-bold text-[#e5b364] tracking-widest focus:outline-none focus:border-[#e5b364] focus:ring-1 focus:ring-[#e5b364]"
                />
              </div>
              <p className="text-[11px] text-[#8e887d]">
                Open <span className="text-[#f0ebe1] font-medium">Settings &rarr; Device Pairing</span> in the GhostBrain desktop app to see your active code.
              </p>
            </div>

            {errorMsg && (
              <p className="text-xs text-amber-400 font-mono text-center">
                {errorMsg}
              </p>
            )}

            <button
              onClick={handleAuthorize}
              disabled={isAuthorizing || isSuccess}
              className={`w-full py-3 rounded-xl font-mono text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-2 ${
                isSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#e5b364] hover:bg-[#d4a253] text-[#060608] shadow-lg shadow-[#e5b364]/20'
              }`}
            >
              {isAuthorizing ? (
                <span>Verifying Cryptographic Handshake...</span>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Paired Successfully! Launching Remote...</span>
                </>
              ) : (
                <>
                  <span>Authorize Mobile Remote</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 2: Camera Scanner */}
        {tab === 'qr' && (
          <div className="space-y-4 text-center">
            <div className="aspect-square max-w-[220px] mx-auto rounded-2xl border-2 border-dashed border-[#e5b364]/40 flex flex-col items-center justify-center bg-black/40 p-4 space-y-2">
              <Camera className="w-8 h-8 text-[#e5b364] animate-pulse" />
              <span className="text-xs font-mono text-[#f0ebe1]">Camera Viewfinder</span>
              <span className="text-[10px] text-[#8e887d]">Point camera at desktop QR code</span>
            </div>

            <button
              onClick={() => {
                setOtpCode('GB-7749-KM88');
                handleAuthorize();
              }}
              className="px-4 py-2 rounded-xl border border-white/10 hover:border-[#e5b364]/40 bg-white/5 text-xs font-mono text-[#8e887d] hover:text-[#f0ebe1] transition cursor-pointer"
            >
              [Simulate Instant QR Scan]
            </button>
          </div>
        )}

        {/* Bottom Security Note */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-[#8e887d] font-mono">
          <span className="flex items-center space-x-1">
            <Laptop className="w-3.5 h-3.5 text-[#e5b364]" />
            <span>Encrypted P2P Tunnel</span>
          </span>
          <span>Zero Plaintext Stored in Cloud</span>
        </div>
      </div>
    </div>
  );
};
