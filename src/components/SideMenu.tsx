import type { Member } from '../types';
import './SideMenu.css';

type ViewMode = 'member' | 'all' | 'history' | 'search';

interface Props {
  members: Member[];
  selectedMemberId: string | null;
  viewMode: ViewMode;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectMember: (id: string) => void;
  onViewAll: () => void;
  onViewHistory: () => void;
  onClose: () => void;
}

export default function SideMenu({
  members, selectedMemberId, viewMode,
  searchQuery, onSearchChange,
  onSelectMember, onViewAll, onViewHistory, onClose,
}: Props) {
  const sorted = [...members].sort((a, b) => a.order - b.order);

  return (
    <>
      <div className="menu-backdrop" onClick={onClose} />
      <nav className="side-menu">
        <div className="menu-header">
          <span className="menu-title">メニュー</span>
          <button className="menu-close" onClick={onClose}>✕</button>
        </div>

        <div className="menu-search-row">
          <input
            className="menu-search"
            placeholder="アイテムを検索…"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onFocus={() => { if (!searchQuery) onSearchChange(''); }}
          />
        </div>

        <button
          className={`menu-nav-btn${viewMode === 'all' ? ' active' : ''}`}
          onClick={() => { onViewAll(); onClose(); }}
        >
          全アイテム
        </button>

        <button
          className={`menu-nav-btn${viewMode === 'history' ? ' active' : ''}`}
          onClick={() => { onViewHistory(); onClose(); }}
        >
          移転履歴
        </button>

        <div className="menu-member-section">
          <p className="menu-member-label">メンバーリスト</p>
          {sorted.length === 0 ? (
            <p className="menu-empty">まだメンバーがいません</p>
          ) : (
            <ul className="menu-member-list">
              {sorted.map(m => (
                <li key={m.id}>
                  <button
                    className={`menu-member-btn${selectedMemberId === m.id && viewMode === 'member' ? ' active' : ''}`}
                    onClick={() => { onSelectMember(m.id); onClose(); }}
                  >
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>
    </>
  );
}
