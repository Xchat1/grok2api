/**
 * 共享前端工具：HTML/属性转义 + 安全 DOM 辅助。
 * 所有动态数据插入 DOM 前必须经过 escapeHtml / escapeAttr。
 * 需在业务脚本之前加载（见各页面 <script> 引入顺序）。
 */
(function (global) {
  'use strict';

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 仅允许 http/https/blob/data 协议的 URL（用于 <img>/<video> src 等）
  function isSafeUrl(url) {
    try {
      const u = new URL(url, window.location.href);
      return ['http:', 'https:', 'blob:', 'data:'].includes(u.protocol);
    } catch (e) {
      return false;
    }
  }

  global.escapeHtml = escapeHtml;
  global.escapeAttr = escapeAttr;
  global.isSafeUrl = isSafeUrl;
})(window);
