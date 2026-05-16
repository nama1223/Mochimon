import { useState } from 'react';
import { ADMIN_TRIGGER } from '../config';
import { authLogin } from '../utils/gasApi';
import type { OrgInfo } from '../types';
import './AuthPage.css';

interface Props {
  storedOrgs: OrgInfo[];
  onAuth: (org: OrgInfo) => void;
  onAdmin: () => void;
}

export default function AuthPage({ storedOrgs, onAuth, onAdmin }: Props) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pw = password.trim();
    if (!pw) return;
    if (pw === ADMIN_TRIGGER) { setPassword(''); onAdmin(); return; }
    setLoading(true);
    setError('');
    try {
      const org = await authLogin(pw);
      onAuth(org);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* キャラクター画像 */}
        <img src="Mochimon192.png" alt="Mochimon" className="auth-logo" />
        <p className="auth-subtitle">もちものリスト管理「Mochimon」</p>

        {/* 以前ログインした団体（フォームより上） */}
        {storedOrgs.length > 0 && (
          <div className="auth-stored">
            <p className="auth-stored-label">以前ログインした団体</p>
            {storedOrgs.map(org => (
              <button key={org.id} className="auth-stored-btn" onClick={() => onAuth(org)}>
                {org.name}
              </button>
            ))}
          </div>
        )}

        {/* 区切り線 */}
        <div className="auth-divider">
          <span>{storedOrgs.length > 0 ? 'または' : 'パスワードでログイン'}</span>
        </div>

        {/* パスワードフォーム */}
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="password"
            placeholder="団体パスワードを入力"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="auth-input"
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-btn" disabled={loading || !password.trim()}>
            {loading ? '確認中…' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}
