import { useState, useRef, useEffect } from 'react';
import { Scan, Camera, X, CheckCircle, AlertCircle } from 'lucide-react';
import { sound } from '../sound.js';

export default function BarcodeModal({ isOpen, onClose, onScan, products = [] }) {
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scannedFeedback, setScannedFeedback] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setManualCode('');
      setScannedFeedback(null);
      setCameraError('');
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);

      // Check if BarcodeDetector API is natively supported in Chromium
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'] });
        const interval = setInterval(async () => {
          if (!videoRef.current || !streamRef.current) {
            clearInterval(interval);
            return;
          }
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              handleDetected(code);
              clearInterval(interval);
            }
          } catch (e) {}
        }, 300);
      }
    } catch (err) {
      setCameraError(err.message || 'Unable to access camera.');
      setCameraActive(false);
    }
  };

  const handleDetected = (code) => {
    sound.playBeep();
    setScannedFeedback(code);
    onScan(code);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!manualCode.trim()) return;
    handleDetected(manualCode.trim());
  };

  if (!isOpen) return null;

  // Filter products that have barcodes for quick test
  const barcodedProducts = products.filter(p => p.barcode);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fcf6e8', color: '#cca043', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scan size={18} />
            </div>
            <div>
              <div className="modal-title">Barcode Scanner</div>
              <div style={{ fontSize: 12, color: '#687b6f' }}>Scan item or type barcode value</div>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {scannedFeedback ? (
            <div style={{ background: '#e4f3ea', padding: 20, borderRadius: 12, textAlign: 'center', color: '#0e7047' }}>
              <CheckCircle size={36} style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 800, fontSize: 16 }}>Barcode Detected!</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{scannedFeedback}</div>
            </div>
          ) : (
            <>
              {/* Camera Scanner Viewport */}
              <div style={{ position: 'relative', background: '#0b120c', borderRadius: 12, overflow: 'hidden', minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {cameraActive ? (
                  <>
                    <video ref={videoRef} style={{ width: '100%', height: 200, objectFit: 'cover' }} autoPlay playsInline muted />
                    {/* Laser aiming line animation */}
                    <div style={{ 
                      position: 'absolute', 
                      top: '50%', 
                      left: '10%', 
                      right: '10%', 
                      height: 2, 
                      background: '#ef4444', 
                      boxShadow: '0 0 8px #ef4444' 
                    }} />
                    <button 
                      onClick={stopCamera} 
                      style={{ position: 'absolute', bottom: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 12 }}
                    >
                      Stop Camera
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 20, color: '#8ca192' }}>
                    <Camera size={34} style={{ margin: '0 auto 8px', opacity: 0.7 }} />
                    <div style={{ fontSize: 13, marginBottom: 10 }}>Use device camera to scan barcodes</div>
                    <button className="btn-primary" onClick={startCamera} style={{ fontSize: 13, padding: '7px 14px' }}>
                      Start Camera
                    </button>
                    {cameraError && (
                      <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{cameraError}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Manual Entry Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  type="text"
                  autoFocus
                  placeholder="Enter or scan barcode here..."
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '0 16px', whiteSpace: 'nowrap' }}>
                  Add Item
                </button>
              </form>

              {/* Quick Barcode Simulator for Demo / Testing */}
              {barcodedProducts.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#556a5c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Quick Test Barcodes (Click to simulate scan)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 110, overflowY: 'auto' }}>
                    {barcodedProducts.slice(0, 8).map(p => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => handleDetected(p.barcode)}
                        style={{
                          background: '#f3f6f3',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 12,
                          color: '#131f16',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#687b6f', fontSize: 11 }}>[{p.barcode}]</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

