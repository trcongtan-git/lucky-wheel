'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function SplitPage() {
  useEffect(() => {
    document.body.classList.add('unified-page');
    return () => document.body.classList.remove('unified-page');
  }, []);

  return (
    <>
      <div className="menubar">
        <div className="menubar-content">
          <span className="logo">DNTN Ngọc Minh</span>
          <div className="menubar-buttons">
            <div className="participant-dropdown-wrap">
              <button type="button" className="menubar-btn import-btn-menubar" id="btnParticipant">
                <span className="btn-text">Nhân viên tham gia lượt</span>
                <span className="player-counter-small" id="playerCounter">0</span>
              </button>
              <div className="participant-popup" id="participantPopup">
                <button type="button" className="participant-popup-option" id="btnImportParticipant">
                  <span className="btn-text">Import</span>
                </button>
                <button type="button" className="participant-popup-option" id="btnDownloadTemplate">
                  <span className="btn-text">Tải Template</span>
                </button>
              </div>
            </div>
            <input type="file" id="fileInput" accept=".xlsx,.xls" style={{ display: 'none' }} />
            <button className="menubar-btn result-btn" id="resultBtn">
              <span className="btn-text">Kết quả</span>
              <span className="result-counter-small" id="resultCounter">0</span>
            </button>
          </div>
        </div>
      </div>

      <div className="wheel-viewport" id="wheelViewport">
        <div className="container" id="wheelSection">
          <div className="wheel-container" id="wheelContainer">
            <div className="wheel-inner-wrap">
              <div className="wheel-wrapper" id="wheelWrapper">
                <canvas id="wheelCanvas" />
              </div>
              <div className="center-button" id="playButton">
                <div className="play-icon">▶</div>
              </div>
              <div className="pointer">
                <div className="pointer-hole">
                  <div className="pointer-inner" />
                </div>
                <div className="pointer-tip" />
              </div>
            </div>
          </div>
          <div className="result-popup" id="resultPopup">
            <div className="popup-content">
              <div className="popup-header-buttons">
                <button type="button" className="popup-egg-btn" id="btnEggInPopup" title="Đập trứng">Đập trứng</button>
                <button className="popup-delete" id="deleteResult" title="Xóa kết quả này">
                  <i className="fa-solid fa-eraser" />
                </button>
                <button className="popup-close" id="closePopup">×</button>
              </div>
              <div className="popup-illustration">
                <div className="party-popper">🎉</div>
              </div>
              <h2 className="popup-title" id="popupTitle">Chúc Mừng!</h2>
              <div className="popup-body">
                <div className="congratulations-text" id="congratulationsText" style={{ display: 'none' }}>Chúc mừng</div>
                <div className="winner-name" id="winnerName" />
                <div className="results-list" id="resultsList" style={{ display: 'none' }} />
              </div>
              <div className="popup-footer-text" id="popupFooterText">Vòng quay may mắn</div>
              <button className="popup-share-btn" id="shareBtn" style={{ display: 'none' }}>Đóng</button>
            </div>
          </div>
        </div>
      </div>

      <div className="egg-fullscreen" id="eggFullscreen">
        <div className="egg-game" id="eggGame">
          <div className="wrap">
            <div className="board" id="eggBoard" aria-label="Bảng trứng" />
          </div>
          <div className="egg-overlay" id="eggOverlay" role="dialog" aria-modal="true" aria-label="Popup kết quả">
            <div className="egg-popup" id="eggPopup">
              <div className="hint" aria-label="Đóng">×</div>
              <h2 className="egg-popup-title" id="eggPopupTitle">Đang mở quà...</h2>
              <div className="reveal" aria-hidden="true">
                <div className="confetti" id="eggConfetti" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="popup-egg is-shaking" id="eggPopupEggImg" alt="Trứng" src="/images/egg-png/closed.png" />
                <div className="popup-gift-text" id="eggPopupGiftText" />
              </div>
              <div className="prize-name" id="eggPrizeName">---</div>
              <div className="footer">Vòng quay may mắn</div>
            </div>
          </div>
        </div>
      </div>

      <Script src="/script.js" strategy="afterInteractive" />
      <Script src="/egg-game-unified.js" strategy="afterInteractive" />
    </>
  );
}
