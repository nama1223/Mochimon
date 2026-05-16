import { useState, useEffect } from 'react';
import { useOrgAuth } from './hooks/useOrgAuth';
import AuthPage from './components/AuthPage';
import AdminPage from './components/AdminPage';
import MainPage from './components/MainPage';
import type { OrgInfo } from './types';

type Screen = 'auth' | 'admin' | 'app';

export default function App() {
  const { storedOrgs, storeOrg } = useOrgAuth();
  const [screen, setScreen] = useState<Screen>('auth');
  const [org, setOrg] = useState<OrgInfo | null>(null);

  // 招待URLからの自動ログイン
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('invite');
    const inviteName = params.get('n');
    if (inviteId && inviteName) {
      const o: OrgInfo = { id: inviteId, name: decodeURIComponent(inviteName) };
      storeOrg(o);
      setOrg(o);
      setScreen('app');
      // URLパラメータを消してきれいにする
      window.history.replaceState({}, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAuth(o: OrgInfo) {
    storeOrg(o);
    setOrg(o);
    setScreen('app');
  }

  function handleLogout() {
    setOrg(null);
    setScreen('auth');
  }

  if (screen === 'admin') {
    return <AdminPage onBack={() => setScreen('auth')} />;
  }

  if (screen === 'app' && org) {
    return <MainPage org={org} onLogout={handleLogout} />;
  }

  return (
    <AuthPage
      storedOrgs={storedOrgs}
      onAuth={handleAuth}
      onAdmin={() => setScreen('admin')}
    />
  );
}
