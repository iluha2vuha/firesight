import "./Header.css";

const Header = ({ activePage, onNavigate }) => {
  const navLinks = ["Map", "Reports", "Alerts"];

  const handleNavigate = (link) => {
    if (onNavigate) onNavigate(link);
  };

  return (
    <header className="header">
      <div className="header-logo">
        <div className="header-logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C8 6 6 9 6 13a6 6 0 0012 0c0-4-2-7-6-11z"
              fill="white"
              opacity="0.9"
            />
            <path
              d="M12 8c-1.5 2.5-2 4-2 6a2 2 0 004 0c0-2-.5-3.5-2-6z"
              fill="white"
            />
          </svg>
        </div>
        <div className="header-logo-text">
          <span className="header-logo-title">NFCC Fire Risk</span>
          <span className="header-logo-subtitle">
            National Fire Chiefs Council
          </span>
        </div>
      </div>

      <nav className="header-nav">
        {navLinks.map((link) => (
          <button
            key={link}
            className={`header-nav-link ${activePage === link ? "active" : ""}`}
            onClick={() => handleNavigate(link)}
          >
            {link}
          </button>
        ))}
      </nav>

      <div className="header-right">
        <div className="header-live-indicator">
          <span className="header-live-dot" />
          <span className="header-live-label">Live data</span>
        </div>
        <div className="header-avatar">MT</div>
      </div>
    </header>
  );
};

export default Header;
