import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { StorageService } from '../../services/storage';
import { getFirebaseConfig } from '../../services/firebase';
import { X, KeyRound, Download, Upload, RotateCcw, Check, Sparkles } from 'lucide-react';

interface FirebaseConfigModalProps {
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ onClose }) => {
  const { updateFirebaseConfig, resetFirebaseConfig, isFirebaseConfigured, login, user } = useAuth();
  const { resetData } = useFinance();

  const currentConfig = getFirebaseConfig() || { apiKey: '', authDomain: '', projectId: '' };
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || '');
  const [authDomain, setAuthDomain] = useState(currentConfig.authDomain || '');
  const [projectId, setProjectId] = useState(currentConfig.projectId || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    updateFirebaseConfig({
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportData = () => {
    const dataStr = StorageService.exportAllData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yuki-finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (StorageService.importAllData(content)) {
        alert('Financial data restored successfully! Reloading...');
        window.location.reload();
      } else {
        alert('Invalid backup JSON format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <KeyRound size={20} color="var(--accent-primary-light)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
              Settings & Authorization
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* Auth Status & Quick Switch */}
        <div className="card" style={{ background: 'var(--bg-surface)', marginBottom: '1.25rem', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>CURRENT SESSION</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                {user ? user.displayName : 'Guest (Unauthenticated)'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {user ? user.email : 'Local offline storage active'}
              </div>
            </div>

            <button
              onClick={login}
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            >
              <Sparkles size={14} />
              <span>{user ? 'Switch / Relog' : 'Google Login'}</span>
            </button>
          </div>
        </div>

        {/* Custom Firebase Setup Form */}
        <form onSubmit={handleSaveFirebase} style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Connect Custom Firebase Project</span>
            {isFirebaseConfigured && (
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                Configured
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Optional: Enter your Firebase project credentials to use your own production Google OAuth and Firestore cloud sync.
          </p>

          <div className="form-group">
            <label className="form-label">Firebase API Key</label>
            <input
              type="text"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Auth Domain</label>
            <input
              type="text"
              placeholder="your-project-id.firebaseapp.com"
              value={authDomain}
              onChange={(e) => setAuthDomain(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Project ID</label>
            <input
              type="text"
              placeholder="your-project-id"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {savedSuccess ? <><Check size={16} /> Saved!</> : 'Save Firebase Keys'}
            </button>
            {isFirebaseConfigured && (
              <button
                type="button"
                onClick={resetFirebaseConfig}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Data Management & Backup */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Vault Data Management
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <button
              onClick={handleExportData}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', gap: '0.4rem' }}
            >
              <Download size={15} />
              <span>Export JSON</span>
            </button>

            <label className="btn btn-secondary" style={{ fontSize: '0.82rem', gap: '0.4rem', cursor: 'pointer', margin: 0 }}>
              <Upload size={15} />
              <span>Import JSON</span>
              <input type="file" accept=".json" onChange={handleImportData} style={{ display: 'none' }} />
            </label>
          </div>

          <button
            onClick={() => {
              if (confirm('Reset all financial sample data to initial state?')) {
                resetData();
                onClose();
              }
            }}
            className="btn btn-ghost"
            style={{ width: '100%', fontSize: '0.8rem', color: 'var(--color-danger-light)' }}
          >
            <RotateCcw size={14} style={{ marginRight: '0.4rem' }} />
            Reset to Sample Data
          </button>
        </div>
      </div>
    </div>
  );
};
