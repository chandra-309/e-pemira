// Lightbox for candidate image
document.addEventListener('click', (e) => {
	const img = e.target.closest('img[data-lightbox]');
	if (!img) return;
	const overlay = document.createElement('div');
	overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:50;';
	const clone = document.createElement('img');
	clone.src = img.src;
	clone.style.cssText = 'max-width:92vw;max-height:92vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.4)';
	overlay.appendChild(clone);
	overlay.addEventListener('click', () => overlay.remove());
	document.body.appendChild(overlay);
});
