'use client';

import { useState } from 'react';
import { resolvePublicImage } from '@/lib/api';

interface FacilityGalleryProps {
  images: string[];
  name: string;
}

export function FacilityGallery({ images, name }: FacilityGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeImages = images.map(resolvePublicImage);
  const hasImages = safeImages.length > 0;

  const goPrevious = () => setActiveIndex(i => (i === 0 ? safeImages.length - 1 : i - 1));
  const goNext = () => setActiveIndex(i => (i === safeImages.length - 1 ? 0 : i + 1));

  if (!hasImages) {
    return (
      <div style={{ borderRadius: 18, height: 300, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
        No photos available
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#F3F4F6' }}>
      <div style={{ position: 'relative', width: '100%', height: 0, paddingBottom: '56.25%' }}>
        <img
          src={safeImages[activeIndex]}
          alt={`${name} photo ${activeIndex + 1}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={goPrevious}
            type="button"
            style={{
              position: 'absolute', top: '50%', left: 16, transform: 'translateY(-50%)',
              width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.85)',
              cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            }}
          >
            ‹
          </button>
          <button
            onClick={goNext}
            type="button"
            style={{
              position: 'absolute', top: '50%', right: 16, transform: 'translateY(-50%)',
              width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.85)',
              cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            }}
          >
            ›
          </button>
        </>
      )}

      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 10, padding: 14, background: 'rgba(255,255,255,0.88)', overflowX: 'auto' }}>
          {safeImages.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setActiveIndex(index)}
              style={{
                flex: '0 0 80px', height: 62, borderRadius: 14, padding: 0, border: activeIndex === index ? '2px solid #1A56CC' : '1px solid #E5E7EB',
                overflow: 'hidden', cursor: 'pointer', background: '#fff', boxShadow: activeIndex === index ? '0 8px 20px rgba(26, 86, 204, 0.12)' : 'none',
              }}
            >
              <img src={src} alt={`${name} thumbnail ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
