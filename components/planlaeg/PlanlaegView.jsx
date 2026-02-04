'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import TravelBar from './TravelBar';
import JobPoolCard from './JobPoolCard';
import RoutePopover from './RoutePopover';
import { api } from '@/lib/constants';
import './planlaeg.css';

const TaskDetailDialog = dynamic(() => import('@/components/dialogs/TaskDetailDialog'), { ssr: false, loading: () => null });

/*
  PlanlaegView.jsx
  Bruger Google Distance Matrix API via /api/travel-distance til ægte køretider.
*/

const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function PoolDropZone({ children }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' });
  return (
    <div ref={setNodeRef} className={`pool-tasks ${isOver ? 'drop-zone-active' : ''}`}>
      {children}
    </div>
  );
}

function getFullAddress(task) {
  const parts = [];
  if (task.address) parts.push(task.address);
  if (task.postalCode) parts.push(task.postalCode);
  if (task.city) parts.push(task.city);
  return parts.length > 0 ? parts.join(', ') : 'Ukendt adresse';
}

export default function PlanlaegView({ user }) {
  const [tasks, setTasks] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechId, setSelectedTechId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [routePopover, setRoutePopover] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [travelData, setTravelData] = useState({});
  const [travelLoading, setTravelLoading] = useState({});
  const [selectedTaskForView, setSelectedTaskForView] = useState(null);
  const [options, setOptions] = useState(null);
  const pendingRequests = useRef({});

  const weekDates = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    const dayOfWeek = monday.getDay() || 7;
    monday.setDate(monday.getDate() - (dayOfWeek - 1) + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);
    return DAYS.map((_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
  }, [weekOffset]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tasksRes, techsRes, optionsRes] = await Promise.all([
          api.get('/tasks?all=true'),
          api.get('/staff-users'),
          api.get('/options').catch(() => null),
        ]);
        setTasks(Array.isArray(tasksRes) ? tasksRes : []);
        setTechnicians(Array.isArray(techsRes) ? techsRes : []);
        if (optionsRes) setOptions(optionsRes);
        if (Array.isArray(techsRes) && techsRes.length && !selectedTechId) {
          setSelectedTechId(techsRes[0].id);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadData();
  }, []);

  const selectedTech = useMemo(
    () => technicians.find(t => t.id === selectedTechId),
    [technicians, selectedTechId]
  );

  const poolTasks = useMemo(() => tasks.filter(t => !t.plannedDate), [tasks]);

  const plannedTasks = useMemo(
    () => tasks.filter(t => t.plannedDate && t.assignedTechnicianId === selectedTechId),
    [tasks, selectedTechId]
  );

  const tasksByDate = useMemo(() => {
    const grouped = {};
    weekDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      grouped[dateStr] = plannedTasks
        .filter(t => t.plannedDate?.startsWith(dateStr))
        .sort((a, b) => new Date(a.plannedDate) - new Date(b.plannedDate));
    });
    return grouped;
  }, [plannedTasks, weekDates]);

  const fetchTravelInfo = useCallback(async (fromAddr, toAddr) => {
    const cacheKey = `${fromAddr}|||${toAddr}`;
    if (travelData[cacheKey]) return travelData[cacheKey];
    if (pendingRequests.current[cacheKey]) return pendingRequests.current[cacheKey];

    setTravelLoading(prev => ({ ...prev, [cacheKey]: true }));

    const promise = fetch('/api/travel-distance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: fromAddr, destination: toAddr }),
    })
      .then(res => res.json())
      .then(data => {
        const result = { km: data.km || 0, minutes: data.minutes || 0 };
        setTravelData(prev => ({ ...prev, [cacheKey]: result }));
        setTravelLoading(prev => ({ ...prev, [cacheKey]: false }));
        delete pendingRequests.current[cacheKey];
        return result;
      })
      .catch(err => {
        console.error('Travel API error:', err);
        const fallback = { km: 0, minutes: 0 };
        setTravelData(prev => ({ ...prev, [cacheKey]: fallback }));
        setTravelLoading(prev => ({ ...prev, [cacheKey]: false }));
        delete pendingRequests.current[cacheKey];
        return fallback;
      });

    pendingRequests.current[cacheKey] = promise;
    return promise;
  }, [travelData]);

  useEffect(() => {
    if (!selectedTech) return;
    const techHome = selectedTech.address || selectedTech.homeAddress || 'Fredericia, Denmark';

    Object.entries(tasksByDate).forEach(([, dayTasks]) => {
      if (dayTasks.length === 0) return;
      fetchTravelInfo(techHome, getFullAddress(dayTasks[0]));
      for (let i = 0; i < dayTasks.length - 1; i++) {
        fetchTravelInfo(getFullAddress(dayTasks[i]), getFullAddress(dayTasks[i + 1]));
      }
      fetchTravelInfo(getFullAddress(dayTasks[dayTasks.length - 1]), techHome);
    });
  }, [tasksByDate, selectedTech, fetchTravelInfo]);

  const getTravelInfo = useCallback((fromAddr, toAddr) => {
    const cacheKey = `${fromAddr}|||${toAddr}`;
    const isLoading = travelLoading[cacheKey] || false;
    const data = travelData[cacheKey] || { km: 0, minutes: 0 };
    return { ...data, loading: isLoading };
  }, [travelData, travelLoading]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id;
    const dropZone = over.id;

    if (dropZone === 'pool') {
      await updateTask(taskId, {
        plannedDate: null,
        assignedTechnicianId: null,
        status: 'under_planning',
      });
    } else if (typeof dropZone === 'string' && dropZone.startsWith('day-')) {
      const dateStr = dropZone.replace('day-', '');
      const existingTasks = tasksByDate[dateStr] || [];
      let nextHour = 7;
      if (existingTasks.length > 0) {
        const lastTask = existingTasks[existingTasks.length - 1];
        const lastStart = new Date(lastTask.plannedDate);
        nextHour = lastStart.getHours() + 2;
      }
      if (nextHour > 16) {
        alert('⚠️ Dagen er fuld! Sidste opgave kan starte kl. 16:00');
        return;
      }
      const plannedDate = new Date(dateStr);
      plannedDate.setHours(nextHour, 0, 0, 0);
      await updateTask(taskId, {
        plannedDate: plannedDate.toISOString(),
        assignedTechnicianId: selectedTechId,
        status: 'under_planning',
      });
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      await api.put(`/tasks/${taskId}`, updates);
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updates } : t)));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleRemoveFromCalendar = async (taskId) => {
    await updateTask(taskId, {
      plannedDate: null,
      assignedTechnicianId: null,
      status: 'under_planning',
    });
  };

  const handleToggleLock = async (taskId, lock) => {
    const newStatus = lock ? 'planned' : 'under_planning';
    await updateTask(taskId, { status: newStatus });
    if (lock) setTimeout(() => alert('✅ Opgaven er nu planlagt!'), 100);
  };

  const handleTravelClick = (fromAddress, toAddress, travelInfo) => {
    setRoutePopover({ fromAddress, toAddress, ...travelInfo });
  };

  const formatDate = (date) => `${date.getDate()}. ${MONTHS[date.getMonth()]}`;
  const techHomeAddress = selectedTech?.address || selectedTech?.homeAddress || 'Fredericia, Denmark';

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="planlaeg-container">
        <div className="planlaeg-header">
          <div className="header-left">
            <span className="header-icon">📅</span>
            <h1 className="header-title">Planlægning (Test)</h1>
          </div>
        </div>

        <div className="planlaeg-content">
          <div className="job-pool-sidebar">
            <div className="pool-header">
              <h2>Job Pool ({poolTasks.length})</h2>
              <p>Træk opgaver til kalenderen →</p>
            </div>

            <div className="tech-selector">
              <label>TEKNIKER</label>
              <select
                value={selectedTechId || ''}
                onChange={(e) => setSelectedTechId(e.target.value)}
              >
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>{tech.name}</option>
                ))}
              </select>
            </div>

            <PoolDropZone>
              <SortableContext items={poolTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {poolTasks.map(task => (
                  <JobPoolCard key={task.id} task={task} onShow={(t) => setSelectedTaskForView(t)} />
                ))}
              </SortableContext>
            </PoolDropZone>
          </div>

          <div className="calendar-section">
            <div className="week-nav">
              <button className="nav-btn" onClick={() => setWeekOffset(w => w - 1)}>‹</button>
              <button className="nav-btn nav-today" onClick={() => setWeekOffset(0)}>I dag</button>
              <button className="nav-btn" onClick={() => setWeekOffset(w => w + 1)}>›</button>
            </div>

            <div className="calendar-grid">
              <div className="calendar-header">
                <div className="calendar-cell header-cell tech-header">TEKNIKER</div>
                {weekDates.map((date, i) => (
                  <div key={i} className="calendar-cell header-cell day-header">
                    <span className="day-name">{DAYS[i]}</span>
                    <span className="day-date">{formatDate(date)}</span>
                  </div>
                ))}
              </div>

              <div className="calendar-body">
                <div className="calendar-cell tech-name-cell">
                  {selectedTech?.name || 'Vælg tekniker'}
                </div>

                {weekDates.map((date, dayIndex) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const dayTasks = tasksByDate[dateStr] || [];
                  return (
                    <DayColumn
                      key={dayIndex}
                      dateStr={dateStr}
                      dayTasks={dayTasks}
                      techHomeAddress={techHomeAddress}
                      getTravelInfo={getTravelInfo}
                      onRemove={handleRemoveFromCalendar}
                      onToggleLock={handleToggleLock}
                      onTravelClick={handleTravelClick}
                      onShowTask={(t) => setSelectedTaskForView(t)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="drag-overlay-card">
              <TaskCard task={activeTask} isDragging />
            </div>
          )}
        </DragOverlay>

        {routePopover && (
          <RoutePopover {...routePopover} onClose={() => setRoutePopover(null)} />
        )}

        {selectedTaskForView && (
          <TaskDetailDialog
            task={selectedTaskForView}
            open={!!selectedTaskForView}
            onClose={() => setSelectedTaskForView(null)}
            options={options}
            onUpdate={async () => {
              const tasksRes = await api.get('/tasks?all=true');
              setTasks(Array.isArray(tasksRes) ? tasksRes : []);
            }}
            user={user}
          />
        )}
      </div>
    </DndContext>
  );
}

function DayColumn({ dateStr, dayTasks, techHomeAddress, getTravelInfo, onRemove, onToggleLock, onTravelClick, onShowTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateStr}` });

  return (
    <div
      ref={setNodeRef}
      className={`calendar-cell day-column ${isOver ? 'day-column-dragover' : ''}`}
    >
      {dayTasks.length > 0 ? (
        <>
          {(() => {
            const toAddr = getFullAddress(dayTasks[0]);
            const travel = getTravelInfo(techHomeAddress, toAddr);
            return (
              <TravelBar
                fromAddress={techHomeAddress}
                toAddress={toAddr}
                minutes={travel.minutes}
                km={travel.km}
                loading={travel.loading}
                onClick={onTravelClick}
                isFromHome={true}
              />
            );
          })()}

          {dayTasks.map((task, index) => {
            const taskAddr = getFullAddress(task);
            const nextAddr = index < dayTasks.length - 1
              ? getFullAddress(dayTasks[index + 1])
              : techHomeAddress;
            const travel = getTravelInfo(taskAddr, nextAddr);
            return (
              <React.Fragment key={task.id}>
                <TaskCard
                  task={task}
                  onRemove={() => onRemove(task.id)}
                  onToggleLock={onToggleLock}
                  onShowTask={onShowTask}
                />
                <TravelBar
                  fromAddress={taskAddr}
                  toAddress={nextAddr}
                  minutes={travel.minutes}
                  km={travel.km}
                  loading={travel.loading}
                  onClick={onTravelClick}
                  isToHome={index === dayTasks.length - 1}
                />
              </React.Fragment>
            );
          })}
        </>
      ) : (
        <div className="empty-day">
          <span>Træk opgave hertil</span>
        </div>
      )}
    </div>
  );
}
