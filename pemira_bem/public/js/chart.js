// Chart rendering for statistics
document.addEventListener('DOMContentLoaded', () => {
	const script = document.querySelector('script[data-candidates]');
	if (!script) return;
	
	const data = JSON.parse(script.getAttribute('data-candidates'));
	const max = Math.max(1, ...data.map(d => d.value));
	const container = document.getElementById('chart');
	
	container.innerHTML = data.map(d => {
		const width = Math.round((d.value / max) * 100);
		return `<div style="display:flex;align-items:center;margin:8px 0">`
			+ `<div style="width:220px">${d.label}</div>`
			+ `<div style="flex:1;background:#e5e7eb;border-radius:10px;overflow:hidden">`
			+ `<div style="width:${width}%;background:#004aad;color:white;padding:8px;border-radius:10px;">${d.value}</div>`
			+ `</div>`
			+ `</div>`
	}).join('');
});
