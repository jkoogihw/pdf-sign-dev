const { PDFDocument } = window.PDFLib;
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const el = {
  pdfFile: document.getElementById('pdfFile'),
  pdfUrl: document.getElementById('pdfUrl'),
  signFile: document.getElementById('signFile'),
  signUrl: document.getElementById('signUrl'),
  signWidth: document.getElementById('signWidth'),
  offsetX: document.getElementById('offsetX'),
  offsetY: document.getElementById('offsetY'),
  signButton: document.getElementById('signButton'),
  status: document.getElementById('status'),
  dropZonePdf: document.getElementById('dropZonePdf'),
  dropZoneSign: document.getElementById('dropZoneSign'),
  signPreview: document.getElementById('signPreview'),
  pdfPreview: document.getElementById('pdfPreview'),
};

function setStatus(message, type = '') {
  el.status.textContent = message;
  el.status.className = `status ${type}`.trim();
}

function findPdfHeaderOffset(bytes, maxScan = 1024) {
  const end = Math.min(bytes.length - 4, maxScan);
  for (let i = 0; i <= end; i += 1) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      return i;
    }
  }
  return -1;
}

function isPdf(bytes) {
  return findPdfHeaderOffset(bytes) >= 0;
}

function normalizePdfBytes(bytes) {
  const offset = findPdfHeaderOffset(bytes);
  if (offset < 0) {
    throw new Error(
      '올바른 PDF 헤더(%PDF-)를 찾지 못했습니다. URL이 실제 PDF가 아닌 HTML/로그인 응답일 수 있습니다.'
    );
  }

  if (offset === 0) {
    return bytes;
  }

  return bytes.slice(offset);
}

function isPng(bytes) {
  return bytes.length >= 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78;
}

async function renderPdfPreview(pdfBytes) {
  const normalized = normalizePdfBytes(pdfBytes);
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(normalized) }).promise;
  const firstPage = await doc.getPage(1);

  const baseViewport = firstPage.getViewport({ scale: 1 });
  const maxEdge = 100;
  const scale = maxEdge / Math.max(baseViewport.width, baseViewport.height);
  const viewport = firstPage.getViewport({ scale });

  const canvas = el.pdfPreview;
  const ctx = canvas.getContext('2d');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await firstPage.render({ canvasContext: ctx, viewport }).promise;
}

async function handleFileSelect(file, type) {
  if (!file) return;

  const container = type === 'pdf' ? el.dropZonePdf : el.dropZoneSign;

  // 시각적 피드백 업데이트
  container.classList.add('has-file');
  const filenameEl = container.querySelector('.filename');
  if (filenameEl) filenameEl.textContent = file.name;

  if (type === 'sign' && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      el.signPreview.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  if (type === 'pdf') {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      validateInputBytes(bytes, 'PDF', file.type || '');
      await renderPdfPreview(bytes);
    } catch (error) {
      setStatus(`PDF 미리보기 실패: ${error.message}`, 'error');
    }
  }
}

function initDropZone(zone, type) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((name) => {
    zone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  zone.addEventListener('dragover', () => zone.classList.add('dragover'));
  ['dragleave', 'drop'].forEach((name) => {
    zone.addEventListener(name, () => zone.classList.remove('dragover'));
  });

  zone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const input = type === 'pdf' ? el.pdfFile : el.signFile;
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;

    handleFileSelect(file, type);
  });

  zone.addEventListener('click', () => {
    const input = type === 'pdf' ? el.pdfFile : el.signFile;
    input.click();
  });
}

// 초기화
initDropZone(el.dropZonePdf, 'pdf');
initDropZone(el.dropZoneSign, 'sign');

el.pdfFile.onchange = (e) => handleFileSelect(e.target.files[0], 'pdf');
el.signFile.onchange = (e) => handleFileSelect(e.target.files[0], 'sign');

function isJpeg(bytes) {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function validateInputBytes(bytes, label, contentType = '') {
  if (label === 'PDF' && !isPdf(bytes)) {
    const typeHint = contentType ? ` (응답 타입: ${contentType})` : '';
    throw new Error(
      `올바른 PDF 파일이 아닙니다${typeHint}. URL 입력 시 로그인 페이지/HTML이 내려오거나 CORS로 차단될 수 있어요. PDF 파일 업로드를 권장합니다.`
    );
  }

  if (label === '서명 이미지' && !isPng(bytes) && !isJpeg(bytes)) {
    throw new Error('서명 이미지는 PNG 또는 JPG 파일만 지원합니다.');
  }
}

async function getInputBytes(fileInput, urlInput, label) {
  if (fileInput.files?.[0]) {
    const file = fileInput.files[0];
    const bytes = new Uint8Array(await file.arrayBuffer());
    validateInputBytes(bytes, label, file.type || '');
    return { bytes, fileName: file.name };
  }

  const url = urlInput.value.trim();
  if (!url) {
    throw new Error(`${label} 파일 업로드 또는 URL 입력이 필요합니다.`);
  }

  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(
      `${label} URL 요청에 실패했습니다. 브라우저 CORS 제한 또는 네트워크 문제일 수 있습니다. (${error.message})`
    );
  }

  if (!response.ok) {
    throw new Error(`${label} URL을 불러오지 못했습니다. (${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';
  const bytes = new Uint8Array(await response.arrayBuffer());
  validateInputBytes(bytes, label, contentType);

  // URL에서 파일명 추출 (확장자 제외)
  let fileName = 'document.pdf';
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    if (lastSegment && lastSegment.includes('.')) {
      fileName = decodeURIComponent(lastSegment);
    }
  } catch (e) {
    // URL 파싱 실패 시 기본값 유지
  }

  return { bytes, fileName };
}

async function findAgentAnchor(pdfBytes) {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;

  // 1단계: 양식 유형 판별을 위한 전체 텍스트 수집 (주로 1페이지)
  let docType = '장기'; // 기본값
  const firstPage = await doc.getPage(1);
  const firstPageContent = await firstPage.getTextContent();
  const fullSpecText = firstPageContent.items.map((it) => it.str).join(' ');

  if (fullSpecText.includes('자동차보험상품')) {
    docType = '자동차';
  } else if (fullSpecText.includes('일반보험상품')) {
    docType = '일반';
  } else if (fullSpecText.includes('보험상품')) {
    docType = '장기';
  }

  // 양식에 따른 기준 키워드 설정
  const anchorKeyword = docType === '장기' ? '보험모집인' : '설계사';
  console.log(`[감지된 양식: ${docType}] 기준 키워드: ${anchorKeyword}`);

  for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
    const page = await doc.getPage(pageNo);
    const textContent = await page.getTextContent();
    const items = textContent.items;

    // 2단계: 기준 키워드('보험모집인' 또는 '설계사') 탐색
    const baseItems = items.filter((item) => String(item.str || '').includes(anchorKeyword));

    for (const baseItem of baseItems) {
      const baseY = baseItem.transform[5];
      const baseX = baseItem.transform[4];

      // 3단계: 동일 선상 우측에서 '(서명/인)' 탐색
      const signTargets = items.filter((item) => {
        const itemY = item.transform[5];
        const itemX = item.transform[4];
        return Math.abs(itemY - baseY) < 5 && itemX >= baseX;
      });

      for (const item of signTargets) {
        const fullText = String(item.str || '');
        const cleanText = fullText.replace(/\s+/g, '');
        if (cleanText.includes('(서명/인)') || cleanText.includes('서명/인') || cleanText.endsWith('인)')) {
          let x = item.transform[4];
          let width = item.width || 40;

          // 이름(조정국 등)과 '(서명/인)'이 한 아이템에 묶여 있는 경우 처리
          const signPartIdx = fullText.indexOf('(');
          if (signPartIdx > 0) {
            const ratio = signPartIdx / fullText.length;
            x += width * ratio;
            width = width * (1 - ratio);
          }

          return {
            pageIndex: pageNo - 1,
            x: x,
            y: item.transform[5],
            width: width,
            text: fullText,
            docType,
          };
        }
      }
    }
  }

  return null;
}

function downloadPdf(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function signPdf() {
  el.signButton.disabled = true;
  setStatus('파일을 불러오는 중입니다...');

  try {
    const { bytes: rawPdfBytes, fileName: originName } = await getInputBytes(el.pdfFile, el.pdfUrl, 'PDF');
    const pdfBytes = normalizePdfBytes(rawPdfBytes);
    const { bytes: signBytes } = await getInputBytes(el.signFile, el.signUrl, '서명 이미지');

    setStatus('서명 위치를 탐색하는 중입니다...');
    const anchor = await findAgentAnchor(pdfBytes);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const image = isPng(signBytes)
      ? await pdfDoc.embedPng(signBytes)
      : await pdfDoc.embedJpg(signBytes);

    const signWidth = Number(el.signWidth.value) || 120;
    const signHeight = (image.height / image.width) * signWidth;
    const dx = Number(el.offsetX.value) || 0;
    const dy = Number(el.offsetY.value) || 0;

    let pageIndex = pdfDoc.getPageCount() - 1;
    let x = 420 + dx;
    let y = 72 + dy;

    if (anchor) {
      pageIndex = anchor.pageIndex;
      // '(서명/인)' 문구의 가로 중앙과 서명 이미지의 가로 중앙을 일치시킴
      x = anchor.x + anchor.width / 2 - signWidth / 2 + dx;

      // 텍스트의 baseline(anchor.y)으로부터 글자 높이 절반 위가 글자 중앙
      // 서명 이미지의 높이 절반을 빼서 글자 중앙과 이미지 중앙을 일치시킴
      const textCenterY = anchor.y + 5; // 일반적인 텍스트 높이의 절반(약 5pt) 가산
      y = textCenterY - signHeight / 2 + dy;
    }

    const page = pdfDoc.getPage(pageIndex);
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    x = Math.max(0, Math.min(x, pageWidth - signWidth));
    y = Math.max(0, Math.min(y, pageHeight - signHeight));

    page.drawImage(image, { x, y, width: signWidth, height: signHeight, opacity: 1 });

    const output = await pdfDoc.save();

    // 출력파일명 생성: 원본파일명_추가서명.pdf
    const nameWithoutExt = originName.replace(/\.[^/.]+$/, "");
    const finalFileName = `${nameWithoutExt}_추가서명.pdf`;

    downloadPdf(output, finalFileName);

    setStatus(
      anchor
        ? `완료! [${anchor.docType}] 양식을 감지하여 서명을 배치했습니다.`
        : '완료! 문구 탐색 실패로 기본 위치에 서명을 배치했습니다.',
      'success'
    );
  } catch (error) {
    setStatus(`실패: ${error.message}`, 'error');
  } finally {
    el.signButton.disabled = false;
  }
}

el.signButton.addEventListener('click', signPdf);
