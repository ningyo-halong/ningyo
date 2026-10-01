import { likesConfig } from './likes-config.js';
import { createLikesApi, getVisitorId, isConfigured } from './likes-api.js';

const widget = document.querySelector('[data-doll-id]');

if (widget && isConfigured(likesConfig)) {
  const api = createLikesApi(likesConfig);
  const stores = [];
  for (const name of ['localStorage', 'sessionStorage']) {
    try { stores.push(window[name]); } catch { /* Storage can be disabled. */ }
  }
  const visitorId = getVisitorId(stores, () => crypto.randomUUID());
  const dollId = Number(widget.dataset.dollId);
  const button = widget.querySelector('.like-button');
  const count = widget.querySelector('.like-count');
  const labelVi = widget.querySelector('.like-label-vi');
  const labelJa = widget.querySelector('.like-label-ja');
  const note = widget.querySelector('.like-note');
  const retry = widget.querySelector('.like-retry');
  let loaded = false;
  let liked = false;
  let sending = false;
  let reading = false;
  let revision = 0;
  let total = 0;

  function render(result) {
    if (result) {
      loaded = true;
      total = Math.max(total, result.count);
      liked = liked || result.liked;
      count.textContent = new Intl.NumberFormat('vi-VN').format(total);
      count.setAttribute('aria-label', `${total} lượt thích / いいね ${total}件`);
    }
    button.disabled = !loaded || liked || sending;
    button.setAttribute('aria-pressed', String(liked));
    button.setAttribute('aria-busy', String(sending));
    labelVi.textContent = sending ? 'Đang gửi…' : liked ? 'Đã thích' : 'Thích';
    labelJa.textContent = sending ? '送信中…' : liked ? 'いいね済み' : 'いいね';
  }

  function showReady() {
    const message = liked
      ? 'Cảm ơn bạn!\nありがとうございます！'
      : 'Bạn thích búp bê này? Hãy chạm vào trái tim.\n気に入ったらハートを押してください。';
    if (note.textContent !== message) note.textContent = message;
    retry.hidden = true;
  }

  async function refresh() {
    if (sending || reading || document.hidden) return;
    reading = true;
    const startedAt = revision;
    retry.disabled = true;
    try {
      const result = await api.get(dollId, visitorId);
      if (startedAt !== revision) return;
      render(result);
      showReady();
    } catch {
      if (startedAt !== revision) return;
      note.textContent = loaded
        ? 'Chưa cập nhật được số lượt thích. Vui lòng thử lại.\n数を更新できません。再読み込みしてください。'
        : 'Chưa tải được số lượt thích. Vui lòng thử lại.\nいいね数を読み込めません。再読み込みしてください。';
      retry.hidden = false;
    } finally {
      reading = false;
      retry.disabled = false;
    }
  }

  button.addEventListener('click', async () => {
    if (!loaded || sending || liked) return;
    sending = true;
    revision += 1; // Ignore any read that began before this write.
    retry.hidden = true;
    render();
    try {
      // Retrying uses the same visitor ID, even if an earlier response was lost.
      const result = await api.like(dollId, visitorId);
      render(result);
      showReady();
    } catch {
      note.textContent = 'Chưa xác nhận được lượt thích. Hãy chạm lại để thử.\n送信を確認できません。もう一度ハートを押してください。';
    } finally {
      sending = false;
      render();
    }
  });
  retry.addEventListener('click', refresh);
  window.addEventListener('focus', refresh);
  window.addEventListener('online', refresh);
  window.addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', refresh);
  // Keep counts shared across visitors while avoiding requests in hidden tabs.
  setInterval(refresh, 30000);
  widget.hidden = false;
  refresh();
}
