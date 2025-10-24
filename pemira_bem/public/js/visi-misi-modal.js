// Modal Visi Misi Kandidat
(function() {
  var modal, closeBtn, namaKandidat, visiDiv, misiDiv, votingDiv;
  function init() {
    modal = document.getElementById('visiMisiModal');
    closeBtn = document.getElementById('closeVisiMisiModal');
    namaKandidat = document.getElementById('modalNamaKandidat');
    visiDiv = document.getElementById('modalVisi');
    misiDiv = document.getElementById('modalMisi');
    votingDiv = document.getElementById('candidatesVoting');
    if (votingDiv && modal && closeBtn && namaKandidat && visiDiv && misiDiv) {
      votingDiv.addEventListener('click', function(e) {
        if (e.target.classList.contains('visi-misi-toggle')) {
          var nama = e.target.getAttribute('data-nama') || '';
          var visi = e.target.getAttribute('data-visi') || '';
          var misi = e.target.getAttribute('data-misi') || '';
          namaKandidat.textContent = nama;
          visiDiv.innerHTML = visi.replace(/\n/g, '<br>');
          misiDiv.innerHTML = misi.replace(/\n/g, '<br>');
          modal.style.display = 'flex';
        }
      });
      closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
      });
      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.style.display = 'none';
      });
    }
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
