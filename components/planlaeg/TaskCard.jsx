'use client';
import React from 'react';
import { useDraggable } from '@dnd-kit/core';

/*
  TaskCard.jsx
  Layout: Header | Tid | Kundenavn | Lokation | Opgavetype-tags (PLA/GLA/ALU/BUN osv.)
  "Reparation" / "Service" / "Øvrig" vises ikke – kun opgavetyper.
*/

const CATEGORY_COLORS = {
  GLA: '#3B82F6',    // Blå
  PRO: '#EF4444',    // Rød
  ALU: '#10B981',    // Grøn
  KAR: '#F59E0B',    // Amber
  BUN: '#8B5CF6',    // Lilla
  TRÆ: '#EC4899',    // Pink
  PLA: '#06B6D4',    // Cyan
  oevrig: '#6B7280', // Grå
  service: '#14B8A6',// Teal
  foraflevering: '#F97316', // Orange
};

// Funktion til at beregne ID-dage farve
const getIdDaysColor = (days) => {
  if (days <= 7) return '#10B981';   // Grøn
  if (days <= 30) return '#F59E0B';  // Gul/Orange
  if (days <= 90) return '#EF4444';  // Rød
  return '#7C3AED';                   // Lilla (meget gammel)
};

export default function TaskCard({ task, onRemove, onToggleLock, onShowTask, isDragging = false }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Status
  const isLocked = task.status === 'planned';
  const statusText = isLocked ? 'PLANLAGT' : 'KLADDE';

  // Tid: Altid 2 timer fra planlagt tidspunkt
  const startTime = task.plannedDate ? new Date(task.plannedDate) : null;
  const endTime = startTime ? new Date(startTime.getTime() + 2 * 60 * 60 * 1000) : null;
  const timeStr = startTime
    ? `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')} – ${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`
    : '00:00 – 02:00';

  // ID dage
  const idDays = task.idDays || Math.floor((new Date() - new Date(task.createdAt || Date.now())) / (1000 * 60 * 60 * 24)) || 0;

  // Opgavetype-tags (PLA, GLA, ALU, BUN osv.) – tydeligt lilla i bunden. Læses fra task.types, taskType eller category.
  const TYPE_TAGS = ['PLA', 'GLA', 'ALU', 'BUN', 'KAR', 'TRÆ', 'PRO', 'foraflevering'];
  let raw = [];
  if (Array.isArray(task.types) && task.types.length > 0) raw = task.types;
  else if (task.taskType) raw = [task.taskType];
  else if (Array.isArray(task.categories)) raw = task.categories;
  else if (typeof task.category === 'string') raw = task.category.split('/').map(c => c.trim()).filter(Boolean);
  else if (Array.isArray(task.tags)) raw = task.tags;
  const typeTags = raw.filter((c) => c && TYPE_TAGS.includes(String(c)));

  // Håndter klik på hængelås
  const handleLockClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onToggleLock) {
      onToggleLock(task.id, !isLocked);
    }
  };

  const handlePoolClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onRemove) onRemove();
  };

  const handleShowTask = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onShowTask) onShowTask(task);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${isLocked ? 'task-card-locked' : 'task-card-draft'} ${isDragging ? 'task-card-dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      {/* Række 1: Header */}
      <div className="task-row task-header">
        <span className="task-number">#{task.taskNumber || task.id?.toString().slice(-4) || '0000'}</span>
        <span className={`task-status-badge ${isLocked ? 'status-locked' : 'status-draft'}`}>
          {statusText}
        </span>
        <div className="task-actions">
          <button className="action-btn btn-pool" onPointerDown={handlePoolClick} title="Tilbage til pool">
            ← Pool
          </button>
          <button type="button" className="action-btn btn-icon" onPointerDown={handleShowTask} title="Vis opgave">
            👁
          </button>
          <button className="action-btn btn-icon" title="Dokumenter">📄</button>
        </div>
      </div>

      {/* Række 2: Tid og badges */}
      <div className="task-row task-time-row">
        <button
          className={`lock-btn ${isLocked ? 'lock-locked' : 'lock-unlocked'}`}
          onPointerDown={handleLockClick}
          title={isLocked ? 'Klik for at låse op (kladde)' : 'Klik for at låse (planlagt)'}
        >
          {isLocked ? '🔒' : '🔓'}
        </button>
        <span className="task-time">{timeStr}</span>
        <span className="task-duration">[2t]</span>
        <span
          className="task-id-days"
          style={{ backgroundColor: getIdDaysColor(idDays) }}
        >
          ID:{idDays}d
        </span>
      </div>

      {/* Række 3: Kundenavn */}
      <div className="task-row task-customer">
        {task.companyName || task.customerName || 'Ukendt kunde'}
      </div>

      {/* Række 4: Lokation (uden Reparation-badge) */}
      <div className="task-row task-location">
        <span className="location-pin">📍</span>
        <span className="location-city">{task.city || task.postalCode || 'Ukendt'}</span>
      </div>

      {/* Række 5: Opgavetype-tags (PLA / GLA / ALU / BUN osv.) – tydelig lilla som infobjælker */}
      {typeTags.length > 0 && (
        <div className="task-row task-categories">
          {typeTags.map((tag, i) => (
            <span key={i} className="category-tag task-type-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
