'use client';
import React from 'react';
import { useDraggable } from '@dnd-kit/core';

/*
  JobPoolCard.jsx
  Kort til opgaver i Job Pool (venstre sidebar)
*/

const getIdDaysColor = (days) => {
  if (days <= 7) return '#10B981';
  if (days <= 30) return '#F59E0B';
  if (days <= 90) return '#EF4444';
  return '#7C3AED';
};

// Vejr ikoner
const WEATHER_ICONS = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  snowy: '❄️',
  windy: '💨',
  indoor: '🏠',
};

export default function JobPoolCard({ task, onShow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const handleShow = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onShow) onShow(task);
  };

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const idDays = task.idDays || Math.floor((new Date() - new Date(task.createdAt || Date.now())) / (1000 * 60 * 60 * 24)) || 0;

  // Opgavetype-tags (PLA, GLA, ALU, BUN osv.) – samme kilde som TaskCard
  const TYPE_TAGS = ['PLA', 'GLA', 'ALU', 'BUN', 'KAR', 'TRÆ', 'PRO', 'foraflevering'];
  let raw = [];
  if (Array.isArray(task.types) && task.types.length > 0) raw = task.types;
  else if (task.taskType) raw = [task.taskType];
  else if (Array.isArray(task.categories)) raw = task.categories;
  else if (typeof task.category === 'string') raw = task.category.split('/').map(c => c.trim()).filter(Boolean);
  else if (Array.isArray(task.tags)) raw = task.tags;
  const typeTags = raw.filter((c) => c && TYPE_TAGS.includes(String(c)));

  const weatherIcon = WEATHER_ICONS[task.weatherType] || WEATHER_ICONS['indoor'];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`pool-card ${isDragging ? 'pool-card-dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      {/* Header: nummer, varighed, vejr + Vis */}
      <div className="pool-card-header">
        <span className="pool-task-number">#{task.taskNumber || task.id?.toString().slice(-4) || '0000'}</span>
        <span className="pool-duration">2t</span>
        <span className="pool-weather">{weatherIcon}</span>
        {onShow && (
          <button type="button" className="pool-btn-vis" onClick={handleShow} title="Vis opgave">
            Vis
          </button>
        )}
      </div>

      {/* Kundenavn */}
      <div className="pool-card-customer">
        {task.companyName || task.customerName || 'Ukendt kunde'}
      </div>

      {/* Adresse */}
      <div className="pool-card-address">
        <span className="address-pin">📍</span>
        <span>{task.postalCode || ''} {task.city || ''}</span>
      </div>

      {/* Footer: opgavetype-tags (PLA/GLA/ALU/BUN) + ID-dage */}
      <div className="pool-card-footer">
        <div className="pool-categories">
          {typeTags.map((tag, i) => (
            <span key={i} className="pool-tag task-type-tag">{tag}</span>
          ))}
        </div>
        <span
          className="pool-id-days"
          style={{ color: getIdDaysColor(idDays) }}
        >
          {idDays} dage
        </span>
      </div>
    </div>
  );
}
