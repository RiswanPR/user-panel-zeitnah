/**
 * Standalone Generator for Zeitnah Premium Email Preview Gallery
 *
 * Generates an interactive, zero-dispatch local HTML gallery showcasing
 * all 11 active email templates in both Desktop and Mobile viewports with
 * side-by-side plain-text alternatives.
 */

import * as fs from 'fs';
import * as path from 'path';
import { renderAllTemplatePreviews, TemplatePreviewItem } from './preview-fixtures';

export function buildGalleryHtml(items: TemplatePreviewItem[]): string {
  const itemsJson = JSON.stringify(items).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zeitnah • Premium Email Experience Preview Gallery</title>
  <style>
    :root {
      --bg-canvas: #090d16;
      --bg-sidebar: #0f172a;
      --bg-card: #131c31;
      --border: #1e293b;
      --border-focus: #38bdf8;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-subtle: #64748b;
      --brand-mint: #9fd5b2;
      --brand-blue: #38bdf8;
      --brand-amber: #fbbf24;
      --brand-red: #f87171;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg-canvas);
      color: var(--text-main);
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* ─── SIDEBAR ─── */
    #sidebar {
      width: 340px;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    .brand-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.95);
    }

    .brand-badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(159, 213, 178, 0.12);
      border: 1px solid rgba(159, 213, 178, 0.3);
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      color: var(--brand-mint);
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .brand-title {
      font-size: 17px;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.3px;
    }

    .brand-subtitle {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .template-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }

    .template-card {
      display: block;
      width: 100%;
      text-align: left;
      padding: 14px 16px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 10px;
      margin-bottom: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      color: var(--text-main);
    }

    .template-card:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
    }

    .template-card.active {
      background: var(--bg-card);
      border-color: var(--brand-blue);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }

    .card-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .card-id {
      font-size: 11px;
      font-weight: 800;
      color: var(--brand-blue);
      font-family: monospace;
    }

    .badge-variant {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-variant.light {
      background: rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .badge-variant.dark {
      background: rgba(30, 41, 59, 0.8);
      color: #94a3b8;
      border: 1px solid var(--border);
    }

    .card-name {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 4px;
    }

    .card-cat {
      font-size: 11px;
      color: var(--text-subtle);
    }

    /* ─── MAIN STAGE ─── */
    #stage {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #060910;
    }

    .stage-header {
      padding: 16px 28px;
      background: var(--bg-sidebar);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .stage-title-wrap h1 {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.3px;
    }

    .stage-title-wrap p {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 3px;
    }

    .controls-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .segmented-control {
      display: inline-flex;
      background: rgba(0, 0, 0, 0.3);
      padding: 3px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .seg-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .seg-btn.active {
      background: #1e293b;
      color: var(--text-main);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .view-content-area {
      flex: 1;
      display: flex;
      overflow: hidden;
      position: relative;
    }

    /* ─── IFRAME PREVIEW CONTAINER ─── */
    .preview-canvas {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 32px;
      overflow-y: auto;
      background: #030712;
      background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px);
      background-size: 24px 24px;
    }

    .iframe-wrapper {
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      width: 600px;
      max-width: 100%;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .iframe-wrapper.mobile {
      width: 375px;
    }

    .device-chrome-bar {
      width: 100%;
      background: #1e293b;
      border-radius: 12px 12px 0 0;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid #334155;
      border-bottom: none;
      font-size: 11px;
      color: #94a3b8;
      font-weight: 600;
    }

    .chrome-dots {
      display: flex;
      gap: 6px;
    }

    .chrome-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #475569;
    }

    iframe {
      width: 100%;
      height: 820px;
      border: 1px solid #334155;
      border-radius: 0 0 12px 12px;
      background: #ffffff;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }

    /* ─── PLAIN TEXT CONTAINER ─── */
    .plaintext-view {
      flex: 1;
      padding: 32px;
      overflow-y: auto;
      background: #030712;
      display: none;
    }

    .plaintext-card {
      max-width: 720px;
      margin: 0 auto;
      background: #0b0f19;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }

    .plaintext-header {
      font-size: 12px;
      font-weight: 700;
      color: var(--brand-mint);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 10px;
    }

    .plaintext-pre {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 13px;
      line-height: 1.7;
      color: #e2e8f0;
      white-space: pre-wrap;
      word-break: break-all;
    }

    /* ─── METADATA CONTAINER ─── */
    .metadata-view {
      flex: 1;
      padding: 32px;
      overflow-y: auto;
      background: #030712;
      display: none;
    }

    .meta-table-card {
      max-width: 720px;
      margin: 0 auto;
      background: #0b0f19;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
    }

    .meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .meta-table th {
      text-align: left;
      padding: 10px 12px;
      color: var(--text-subtle);
      border-bottom: 1px solid var(--border);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      width: 140px;
    }

    .meta-table td {
      padding: 10px 12px;
      color: var(--text-main);
      border-bottom: 1px solid rgba(30, 41, 59, 0.5);
    }

    .zero-dispatch-badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #34d399;
    }
  </style>
</head>
<body>

  <!-- Sidebar -->
  <aside id="sidebar">
    <div class="brand-header">
      <div class="brand-badge">ZEITNAH EMAIL SYSTEM</div>
      <div class="brand-title">Template Gallery</div>
      <div class="brand-subtitle">Phase 2 Verified Synthetic Gallery</div>
    </div>
    <div class="template-list" id="templateList"></div>
  </aside>

  <!-- Main Stage -->
  <main id="stage">
    <div class="stage-header">
      <div class="stage-title-wrap">
        <h1 id="activeTitle">Loading...</h1>
        <p id="activeSubtitle"></p>
      </div>
      <div class="controls-wrap">
        <!-- View Mode (HTML vs Plain Text vs Metadata) -->
        <div class="segmented-control" id="viewModeControl">
          <button class="seg-btn active" data-view="html">HTML Email</button>
          <button class="seg-btn" data-view="text">Plain Text</button>
          <button class="seg-btn" data-view="meta">Metadata</button>
        </div>

        <!-- Viewport Width Toggle -->
        <div class="segmented-control" id="viewportControl">
          <button class="seg-btn active" data-viewport="desktop">Desktop (600px)</button>
          <button class="seg-btn" data-viewport="mobile">Mobile (375px)</button>
        </div>
      </div>
    </div>

    <div class="view-content-area">
      <!-- HTML Preview -->
      <div class="preview-canvas" id="htmlCanvas">
        <div class="iframe-wrapper" id="iframeWrapper">
          <div class="device-chrome-bar">
            <div class="chrome-dots">
              <div class="chrome-dot"></div>
              <div class="chrome-dot"></div>
              <div class="chrome-dot"></div>
            </div>
            <span id="chromeLabel">600px Email Container</span>
            <span>Client: HTML5 Standard</span>
          </div>
          <iframe id="previewIframe" sandbox="allow-same-origin"></iframe>
        </div>
      </div>

      <!-- Plain Text Preview -->
      <div class="plaintext-view" id="plaintextCanvas">
        <div class="plaintext-card">
          <div class="plaintext-header">Synchronized Plain-Text Alternative</div>
          <pre class="plaintext-pre" id="plaintextContent"></pre>
        </div>
      </div>

      <!-- Metadata View -->
      <div class="metadata-view" id="metadataCanvas">
        <div class="meta-table-card">
          <table class="meta-table">
            <tr>
              <th>Template ID</th>
              <td id="metaId"></td>
            </tr>
            <tr>
              <th>Template Name</th>
              <td id="metaName"></td>
            </tr>
            <tr>
              <th>Category</th>
              <td id="metaCategory"></td>
            </tr>
            <tr>
              <th>Visual Archetype</th>
              <td id="metaVariant"></td>
            </tr>
            <tr>
              <th>Trigger Flow</th>
              <td id="metaTrigger"></td>
            </tr>
            <tr>
              <th>Recipient</th>
              <td id="metaRecipient"></td>
            </tr>
            <tr>
              <th>Subject Line</th>
              <td id="metaSubject"></td>
            </tr>
            <tr>
              <th>Delivery Safety</th>
              <td><span class="zero-dispatch-badge">Zero-Dispatch Guaranteed (Synthetic)</span></td>
            </tr>
            <tr>
              <th>Implementation Notes</th>
              <td id="metaNotes"></td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </main>

  <script>
    const templates = ${itemsJson};
    let activeIndex = 0;
    let currentView = 'html';
    let currentViewport = 'desktop';

    const templateListEl = document.getElementById('templateList');
    const previewIframe = document.getElementById('previewIframe');
    const iframeWrapper = document.getElementById('iframeWrapper');
    const chromeLabel = document.getElementById('chromeLabel');
    const plaintextContent = document.getElementById('plaintextContent');
    const activeTitle = document.getElementById('activeTitle');
    const activeSubtitle = document.getElementById('activeSubtitle');

    const htmlCanvas = document.getElementById('htmlCanvas');
    const plaintextCanvas = document.getElementById('plaintextCanvas');
    const metadataCanvas = document.getElementById('metadataCanvas');

    // Build sidebar list
    templates.forEach((item, index) => {
      const card = document.createElement('button');
      card.className = 'template-card' + (index === 0 ? ' active' : '');
      card.innerHTML = \`
        <div class="card-meta">
          <span class="card-id">\${item.id}</span>
          <span class="badge-variant \${item.variant}">\${item.variant}</span>
        </div>
        <div class="card-name">\${item.name}</div>
        <div class="card-cat">\${item.category}</div>
      \`;
      card.addEventListener('click', () => selectTemplate(index));
      templateListEl.appendChild(card);
    });

    function selectTemplate(index) {
      activeIndex = index;
      document.querySelectorAll('.template-card').forEach((el, i) => {
        el.classList.toggle('active', i === index);
      });

      const t = templates[index];
      activeTitle.textContent = t.name;
      activeSubtitle.textContent = \`Subject: \${t.subject}\`;

      // Set HTML in iframe
      previewIframe.srcdoc = t.html;

      // Set Plain Text
      plaintextContent.textContent = t.text;

      // Set Metadata
      document.getElementById('metaId').textContent = t.id;
      document.getElementById('metaName').textContent = t.name;
      document.getElementById('metaCategory').textContent = t.category;
      document.getElementById('metaVariant').textContent = t.variant.toUpperCase();
      document.getElementById('metaTrigger').textContent = t.trigger;
      document.getElementById('metaRecipient').textContent = t.recipient;
      document.getElementById('metaSubject').textContent = t.subject;
      document.getElementById('metaNotes').textContent = t.notes || 'N/A';
    }

    // View Mode Switcher
    document.querySelectorAll('#viewModeControl .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#viewModeControl .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;

        htmlCanvas.style.display = currentView === 'html' ? 'flex' : 'none';
        plaintextCanvas.style.display = currentView === 'text' ? 'block' : 'none';
        metadataCanvas.style.display = currentView === 'meta' ? 'block' : 'none';
      });
    });

    // Viewport Toggle
    document.querySelectorAll('#viewportControl .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#viewportControl .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentViewport = btn.dataset.viewport;

        if (currentViewport === 'mobile') {
          iframeWrapper.classList.add('mobile');
          chromeLabel.textContent = '375px Mobile Viewport';
        } else {
          iframeWrapper.classList.remove('mobile');
          chromeLabel.textContent = '600px Email Container';
        }
      });
    });

    // Initial render
    selectTemplate(0);
  </script>
</body>
</html>`;
}

export function generateAndSaveGallery() {
  const items = renderAllTemplatePreviews();
  const html = buildGalleryHtml(items);

  // Target paths in both repositories
  const userPanelPath = path.resolve(
    __dirname,
    '../../../../docs/email-preview-gallery/index.html',
  );
  const adminPanelPath = path.resolve(
    __dirname,
    '../../../../../admin-panel/docs/email-preview-gallery/index.html',
  );

  const writeGallery = (targetPath: string) => {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(targetPath, html, 'utf8');
  };

  writeGallery(userPanelPath);
  writeGallery(adminPanelPath);

  return { itemsCount: items.length, userPanelPath, adminPanelPath };
}

// Auto-run if executed directly via node/ts-node
if (require.main === module) {
  const res = generateAndSaveGallery();
  console.log(
    `✓ Generated Zeitnah Email Preview Gallery (${res.itemsCount} templates) successfully:`,
  );
  console.log(`  - ${res.userPanelPath}`);
  console.log(`  - ${res.adminPanelPath}`);
}
