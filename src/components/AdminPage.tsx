import { useState, useEffect } from 'react';
import { adminVerify, adminGetOrgs, adminCreateOrg, adminDeleteOrg } from '../utils/gasApi';
import type { OrgInfo } from '../types';
import './AdminPage.css';

interface Props {
  onBack: () => void;
}

type OrgWithPw = OrgInfo & { password: string };

export default function AdminPage({ onBack }: Props) {
  const [token, setToken] = useState(() => sessionStorage.getItem('adminToken') ?? '');
  const [authed, setAuthed] = useState(false);
  const [orgs, setOrgs] = useState<OrgWithPw[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [newName, setNewName] = useState('');
  const [newPw, setNewPw] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await adminVerify(token);
      sessionStorage.setItem('adminToken', token);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '認証失敗');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    adminGetOrgs(token)
      .then(setOrgs)
      .catch(e => setError(e instanceof Error ? e.message : 'エラー'))
      .finally(() => setLoading(false));
  }, [authed, token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newPw.trim()) return;
    setCreating(true);
    try {
      const org = await adminCreateOrg(token, newName.trim(), newPw.trim());
      setOrgs(prev => [...prev, { ...org, password: newPw.trim() }]);
      setNewName('');
      setNewPw('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラー');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(orgId: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？\nデータは全て消えます。`)) return;
    try {
      await adminDeleteOrg(token, orgId);
      setOrgs(prev => prev.filter(o => o.id !== orgId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラー');
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('adminToken');
    onBack();
  }

  if (!authed) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <button className="admin-back" onClick={onBack}>← 戻る</button>
          <h2 className="admin-heading">管理者ログイン</h2>
          <form onSubmit={handleVerify} className="admin-form">
            <input
              type="password"
              placeholder="管理者トークン"
              value={token}
              onChange={e => setToken(e.target.value)}
              className="admin-input"
              autoFocus
            />
            {error && <p className="admin-error">{error}</p>}
            <button type="submit" className="admin-btn" disabled={loading || !token}>
              {loading ? '確認中…' : 'ログイン'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2 className="admin-heading">管理画面</h2>
        <button className="admin-back" onClick={handleLogout}>ログアウト</button>
      </div>

      <div className="admin-section">
        <h3 className="admin-section-title">新規団体作成</h3>
        <form onSubmit={handleCreate} className="admin-create-form">
          <input
            className="admin-input"
            placeholder="団体名"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <input
            className="admin-input"
            placeholder="パスワード"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
          />
          <button type="submit" className="admin-btn" disabled={creating || !newName.trim() || !newPw.trim()}>
            {creating ? '作成中…' : '作成'}
          </button>
        </form>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-section">
        <h3 className="admin-section-title">団体一覧 ({orgs.length})</h3>
        {loading ? (
          <p className="admin-loading">読み込み中…</p>
        ) : (
          <ul className="admin-org-list">
            {orgs.map(org => (
              <li key={org.id} className="admin-org-item">
                <div className="admin-org-info">
                  <span className="admin-org-name">{org.name}</span>
                  <span className="admin-org-pw">PW: {org.password}</span>
                </div>
                <button
                  className="admin-delete-btn"
                  onClick={() => handleDelete(org.id, org.name)}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
