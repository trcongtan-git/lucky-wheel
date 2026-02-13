'use client';

export default function ClearStorageButton() {
  const handleClear = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('lucky-spin-split-store');
    localStorage.removeItem('lucky-spin-store');
    window.location.reload();
  };

  return (
    <button
      type="button"
      className="clear-storage-btn"
      onClick={handleClear}
      title="Xóa dữ liệu và tải lại trang"
      aria-label="Xóa dữ liệu localStorage và tải lại"
    >
      <i className="fa-solid fa-trash" />
    </button>
  );
}
