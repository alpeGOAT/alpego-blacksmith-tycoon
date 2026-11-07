(() => {
  'use strict';
  const audio = document.getElementById('background-music');
  const button = document.getElementById('music-toggle');
  const label = document.getElementById('music-label');
  const status = document.getElementById('music-status');
  let enabled = false, playbackRequest = 0, loading = false;
  audio.volume = .35;

  function render(playing, starting = false) {
    loading = starting;
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-busy', String(loading));
    button.dataset.playing = String(playing);
    label.textContent = loading ? 'Starting…' : playing ? 'Music: On' : 'Music: Off';
    button.title = `${enabled ? 'Pause' : 'Play'} The Old Tower Inn — RandomMind (CC0)`;
  }

  function failed(error) {
    enabled = false; playbackRequest++;
    audio.pause(); render(false);
    status.textContent = error?.name === 'NotAllowedError'
      ? 'Your browser blocked music playback. Click Music to try again. If needed, open the game at http://localhost:4173.'
      : 'Music could not load. If you opened index.html directly, run node server.js and open http://localhost:4173.';
  }

  button.addEventListener('click', async () => {
    enabled = !enabled;
    const request = ++playbackRequest;
    status.textContent = '';
    if (!enabled) { audio.pause(); render(false); return; }
    render(false, true);
    try {
      if (audio.error) audio.load();
      await audio.play();
      if (request === playbackRequest && enabled) render(true);
      else if (!enabled) audio.pause();
    } catch (error) {
      if (request === playbackRequest) failed(error);
    }
  });
  audio.addEventListener('error', failed);
  audio.addEventListener('pause', () => {
    if (loading) return;
    if (enabled) { enabled = false; playbackRequest++; }
    render(false);
  });
  render(false);
})();
