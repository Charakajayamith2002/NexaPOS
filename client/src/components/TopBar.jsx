import { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  ChevronLeft, 
  Search, 
  Scan, 
  Volume2, 
  VolumeX, 
  ShoppingCart,
  Maximize2,
  Minimize2,
  Store,
  ChevronDown,
  Wifi,
  WifiOff,
  RefreshCw,
  Check
} from 'lucide-react';
import { sound } from '../sound.js';

export default function TopBar({
  title = 'Sell',
  onBack,
  showBack = false,
  onOpenMobileMenu,
  onOpenShiftModal,
  onOpenScanModal,
  onSearch,
  searchQuery = '',
  cartCount = 0,
  onOpenMobileCart,
  currentView,
  branches = [],
  activeBranch = null,
  onSelectBranch,
  onOpenOfflineModal,
  offlineCount = 0,
  isOnline = true,
  isSyncing = false,
  onNavigate
}) {
  const [soundOn, setSoundOn] = useState(sound.enabled);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const searchInputRef = useRef(null);
  const branchDropdownRef = useRef(null);

  const toggleSound = () => {
    sound.enabled = !soundOn;
    setSoundOn(!soundOn);
    if (!soundOn) sound.playBeep();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Close branch dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: '/' to focus search
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Hamburger Menu on Mobile */}
        <button 
          className="topbar-back-btn" 
          onClick={onOpenMobileMenu}
          title="Open menu"
          style={{ display: 'inline-flex' }}
        >
          <Menu size={20} />
        </button>

        {showBack && onBack && (
          <button className="topbar-back-btn" onClick={onBack} title="Back">
            <ChevronLeft size={19} />
          </button>
        )}

        <div className="topbar-title">
          <span>{title}</span>
          <button 
            type="button" 
            className="badge-shift"
            onClick={onOpenShiftModal}
            title="View shift details"
          >
            <span className="pulse-dot"></span>
            <span>Shift open</span>
          </button>
        </div>

        {/* Multi-Branch Selector Dropdown */}
        <div style={{ position: 'relative' }} ref={branchDropdownRef}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#f4f7f4',
              border: '1px solid #d4e2d8',
              borderRadius: 8,
              padding: '5px 10px',
              fontSize: 12.5,
              fontWeight: 700,
              color: '#1b3223',
              height: 32
            }}
            title="Switch store branch location"
          >
            <Store size={14} style={{ color: '#0e7047' }} />
            <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeBranch ? `${activeBranch.name} (${activeBranch.code})` : 'All Branches'}
            </span>
            <ChevronDown size={13} style={{ color: '#687b6f' }} />
          </button>

          {isBranchDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 6,
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-lg)',
              zIndex: 100,
              minWidth: 240,
              padding: '6px 0'
            }}>
              <div style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#687b6f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Store Branch Location
              </div>
              {branches.map(b => (
                <button
                  key={b._id}
                  type="button"
                  onClick={() => {
                    if (onSelectBranch) onSelectBranch(b);
                    setIsBranchDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: b._id === activeBranch?._id ? 700 : 500,
                    color: b._id === activeBranch?._id ? '#0e7047' : '#111a14',
                    background: b._id === activeBranch?._id ? '#eaf4ee' : 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#687b6f' }}>
                      {b.code}
                    </span>
                    <span>{b.name}</span>
                  </div>
                  {b._id === activeBranch?._id && <Check size={14} style={{ color: '#0e7047' }} />}
                </button>
              ))}
              {onNavigate && (
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBranchDropdownOpen(false);
                      onNavigate('branches');
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 14px',
                      fontSize: 12,
                      color: 'var(--brand)',
                      fontWeight: 600,
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    + Manage Store Branches
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="topbar-right">
        {/* Offline & Sync Status Indicator */}
        <button
          type="button"
          onClick={onOpenOfflineModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: !isOnline ? '#fee2e2' : offlineCount > 0 ? '#fef3c7' : '#e4f3ea',
            border: `1px solid ${!isOnline ? '#fca5a5' : offlineCount > 0 ? '#fde68a' : '#c8e4d2'}`,
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
            color: !isOnline ? '#dc2626' : offlineCount > 0 ? '#b45309' : '#0e7047',
            height: 32,
            cursor: 'pointer'
          }}
          title={isOnline ? `${offlineCount} offline sales pending` : 'Offline Mode Active'}
        >
          {!isOnline ? (
            <>
              <WifiOff size={14} />
              <span>Offline ({offlineCount})</span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw size={13} className="spin" />
              <span>Syncing...</span>
            </>
          ) : offlineCount > 0 ? (
            <>
              <Wifi size={14} />
              <span>{offlineCount} Pending</span>
            </>
          ) : (
            <>
              <span className="pulse-dot" style={{ width: 6, height: 6, background: '#10b981' }} />
              <span>Online</span>
            </>
          )}
        </button>
        {/* Universal Search Bar */}
        <div className="topbar-search-box">
          <Search size={15} className="topbar-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="topbar-search-input"
            placeholder="Search records... (/)"
            value={searchQuery}
            onChange={e => onSearch && onSearch(e.target.value)}
          />
        </div>

        {/* Golden Scan Barcode Button */}
        <button 
          className="btn-amber"
          onClick={onOpenScanModal}
          title="Open Barcode Scanner (or camera)"
          style={{ height: 35, padding: '0 13px', fontSize: 13 }}
        >
          <Scan size={16} />
          <span style={{ fontWeight: 700 }}>Scan</span>
        </button>

        {/* Audio feedback toggle */}
        <button 
          className="btn-ghost"
          onClick={toggleSound}
          title={soundOn ? 'Sound effects enabled' : 'Sound effects muted'}
          style={{ padding: 7, borderRadius: 8 }}
        >
          {soundOn ? <Volume2 size={17} style={{ color: '#0e7047' }} /> : <VolumeX size={17} />}
        </button>

        {/* Fullscreen toggle for POS kiosks */}
        <button 
          className="btn-ghost"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen kiosk mode'}
          style={{ padding: 7, borderRadius: 8 }}
        >
          {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>

        {/* Mobile Cart Trigger Button (visible when on Sell view) */}
        {currentView === 'pos' && cartCount > 0 && (
          <button 
            className="btn-primary"
            onClick={onOpenMobileCart}
            style={{ 
              height: 35, 
              padding: '0 12px', 
              fontSize: 13,
              borderRadius: 8,
              position: 'relative'
            }}
          >
            <ShoppingCart size={16} />
            <span style={{ 
              background: '#ffffff', 
              color: '#0e7047', 
              borderRadius: 99, 
              padding: '1px 6px', 
              fontSize: 11, 
              fontWeight: 800 
            }}>
              {cartCount}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}

