/** 공유 시트(카카오톡 등)로 파일을 보낸다. 지원하지 않으면 내려받기로 대신한다. */
export async function shareOrDownload(file: File, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // 공유 실패 시 내려받기로 넘어간다.
    }
  }
  downloadFile(file);
  return 'downloaded';
}

export function downloadFile(file: Blob & { name?: string }, name = file.name ?? 'download'): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
