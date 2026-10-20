'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

type Props = { readonly productId: string; readonly imageUrl: string; readonly disabled?: boolean; readonly onBusyChange?: (busy: boolean) => void };

export function AdminProductImageEditor({ productId, imageUrl, disabled = false, onBusyChange }: Props) {
  const [savedImage, setSavedImage] = useState(imageUrl);
  const [selection, setSelection] = useState<{ readonly file: File; readonly url: string } | null>(null);
  const file = selection?.file ?? null;
  const preview = selection?.url ?? null;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!selection) return;
    return () => URL.revokeObjectURL(selection.url);
  }, [selection]);

  function clearSelection() {
    setSelection(null);
    setError('');
    setMessage('');
    if (input.current) input.current.value = '';
  }

  async function save() {
    if (!file || inFlight.current || disabled) return;
    inFlight.current = true;
    setSaving(true);
    onBusyChange?.(true);
    setError('');
    setMessage('');
    const body = new FormData();
    body.set('image', file);
    // multipart는 개행을 CRLF로 바꾸므로 저장된 빈 값도 정확한 CAS 토큰으로 전달한다.
    body.set('expectedImageUrl', encodeURIComponent(savedImage));
    body.set('expectedImageUrlEncoding', 'uri');
    try {
      const response = await fetch(`/api/admin/catalog/${encodeURIComponent(productId)}/image`, { method: 'POST', body, signal: AbortSignal.timeout(30_000) });
      if (!response.ok) {
        setError(response.status === 409 ? '다른 작업에서 대표 사진이 변경되었습니다. 새로고침 후 다시 시도해 주세요.' : '대표 사진을 저장하지 못했습니다. 다시 시도해 주세요.');
        return;
      }
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object' || !('data' in payload) || !payload.data || typeof payload.data !== 'object' || !('imageUrl' in payload.data) || typeof payload.data.imageUrl !== 'string') {
        setError('저장 결과를 확인하지 못했습니다. 새로고침해 주세요.');
        return;
      }
      setSavedImage(payload.data.imageUrl);
      setImageFailed(false);
      setSelection(null);
      if (input.current) input.current.value = '';
      setMessage('대표 사진을 저장했습니다. 다른 상품 정보는 변경하지 않았습니다.');
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setError('연결이 원활하지 않습니다. 선택한 사진은 유지됩니다. 다시 시도해 주세요.');
    } finally {
      inFlight.current = false;
      setSaving(false);
      onBusyChange?.(false);
    }
  }

  return <section aria-labelledby="product-image-heading" className="space-y-3 rounded border border-zinc-700 bg-zinc-900/50 p-4">
    <div><h2 id="product-image-heading" className="font-bold">대표 사진</h2><p className="mt-1 text-xs text-zinc-400">JPG · PNG · WebP, 최대 3MB. 사진은 아래 버튼으로 별도 저장합니다.</p></div>
    <div className="flex flex-wrap items-start gap-4">
      {(imageFailed || savedImage.trim() === '') && !preview ? <div aria-label="현재 대표 사진 이미지 없음" className="flex h-40 w-32 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-400">이미지 없음</div> : <Image key={preview ?? savedImage} src={preview ?? savedImage} alt={preview ? '저장 전 대표 사진 미리보기' : '현재 대표 사진'} width={128} height={160} unoptimized onError={() => setImageFailed(true)} className="h-40 w-32 rounded bg-zinc-800 object-cover" />}
      <div className="min-w-0 flex-1 space-y-3">
        <label className="block text-sm">새 대표 사진 선택<input ref={input} disabled={saving || disabled} type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-zinc-700 file:px-3 file:py-2 file:text-white" onChange={(event) => {
          const selected = event.target.files?.[0];
          setMessage('');
          setError('');
          if (!selected) return;
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size === 0 || selected.size > 3 * 1024 * 1024) {
            setSelection(null);
            event.target.value = '';
            setError('3MB 이하 JPG, PNG, WebP 사진을 선택해 주세요.');
            return;
          }
          setSelection({ file: selected, url: URL.createObjectURL(selected) });
          setImageFailed(false);
        }} /></label>
        {file ? <p className="break-all text-xs text-amber-300">{file.name} · 미리보기 — 아직 저장되지 않았습니다.</p> : null}
        <div className="flex flex-wrap gap-2"><button type="button" disabled={!file || saving || disabled} onClick={() => void save()} className="rounded bg-brand-neon px-3 py-2 text-sm font-bold text-black disabled:opacity-40">{saving ? '사진 저장 중' : '대표 사진 저장'}</button><button type="button" disabled={!file || saving || disabled} onClick={clearSelection} className="rounded border border-zinc-600 px-3 py-2 text-sm disabled:opacity-40">사진 선택 취소</button></div>
      </div>
    </div>
    {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
    {message ? <p role="status" className="text-sm text-emerald-400">{message}</p> : null}
    <p className="text-xs text-zinc-500">기존 사진 파일과 상세 사진은 주문 이력 보존을 위해 삭제하지 않습니다.</p>
  </section>;
}
