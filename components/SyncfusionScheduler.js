'use client'

import React, { useRef, useCallback } from 'react'
import {
  ScheduleComponent,
  ViewsDirective,
  ViewDirective,
  ResourcesDirective,
  ResourceDirective,
  Inject,
  Day,
  Week,
  WorkWeek,
  DragAndDrop,
  Resize
} from '@syncfusion/ej2-react-schedule'

/*
  Lightweight SyncfusionScheduler (Syncfusion AI official version)
  - Forces visual 2-hour blocks (snapped)
  - Inserts travel events if provided by parent (must include TechnicianId)
  - eventRendered enforces inline styles for colors and travel clickability
  - Minimal template for performance
*/

export default function SyncfusionScheduler({
  localTasks = [],
  travelEvents = [],
  resourceData = [],
  onTaskUpdate,
  onTaskRemove,
  onTaskDrop,
  onStatusChange,
  height = '720px'
}) {
  const scheduleRef = useRef(null)

  const snapToHour = (date) => {
    const d = new Date(date)
    d.setMinutes(0, 0, 0)
    return d
  }

  const normalizeAndMergeSchedule = useCallback((tasks = [], travel = []) => {
    const taskCopy = tasks.map(t => ({ ...t }))
    const generatedTravel = []

    const groups = {}
    taskCopy.forEach(ev => {
      if (!ev.TechnicianId) return
      const key = `${ev.TechnicianId}::${new Date(ev.StartTime).toDateString()}`
      groups[key] = groups[key] || []
      groups[key].push(ev)
    })

    Object.values(groups).forEach(list => {
      list.sort((a, b) => new Date(a.StartTime) - new Date(b.StartTime))
      let cursor = null
      for (let i = 0; i < list.length; i++) {
        const ev = list[i]
        let s = snapToHour(ev.StartTime || new Date())
        if (cursor && s < cursor) s = new Date(cursor)
        ev.StartTime = new Date(s)
        // VISUAL rule: force 2 hours
        ev.EndTime = new Date(ev.StartTime.getTime() + 2 * 60 * 60 * 1000)
        ev.status = ev.status || (ev.IsLocked ? 'PLANLAGT' : 'KLADDE')
        ev.cssClass = ev.cssClass || (ev.status === 'PLANLAGT' ? 'locked-task' : 'draft-task')
        cursor = new Date(ev.EndTime)

        const next = list[i + 1]
        if (next) {
          const travelMin = ev._computedTravelToNextMin || ev._travelToNextMin || 15
          const travelKm = Math.round(ev._computedTravelKmToNext || ev._travelToNextKm || 1)
          const travelStart = new Date(ev.EndTime)
          const travelEnd = new Date(travelStart.getTime() + travelMin * 60 * 1000)
          generatedTravel.push({
            Id: `travel-${ev.Id}-${next.Id}`,
            Subject: `🚗 ${travelMin} min • ${travelKm} km`,
            StartTime: travelStart,
            EndTime: travelEnd,
            IsAllDay: false,
            IsBlock: true,
            IsReadonly: true,
            status: 'TRAVEL',
            cssClass: 'travel-event',
            CategoryColor: '#F5F5DC',
            TechnicianId: ev.TechnicianId,
            Duration: travelMin,
            Distance: travelKm,
            TravelData: ev._travelMetaToNext || null
          })
          cursor = new Date(travelEnd)
          if (new Date(next.StartTime) < cursor) next.StartTime = new Date(cursor)
        }
      }
    })

    // include provided travel events too (they must have TechnicianId)
    const providedTravel = (travel || []).filter(t => t.TechnicianId)
    return [...taskCopy, ...generatedTravel, ...providedTravel]
  }, [])

  const getScheduleData = useCallback(() => {
    const taskEvents = localTasks.map(task => {
      const start = task.StartTime ? new Date(task.StartTime) : new Date(task.plannedDate)
      const est = task.estimatedTime || 2
      return {
        Id: task.id,
        Subject: `#${task.taskNumber || task.id}`,
        StartTime: start,
        EndTime: new Date(start.getTime() + (est * 60 * 60 * 1000)),
        TaskId: task.id,
        TaskNumber: task.taskNumber,
        CompanyName: task.companyName,
        Address: task.address,
        PostalCode: task.postalCode,
        City: task.city,
        EstimatedTime: est,
        status: task.status === 'planned' ? 'PLANLAGT' : 'KLADDE',
        cssClass: task.status === 'planned' ? 'locked-task' : 'draft-task',
        CategoryColor: task.status === 'planned' ? '#90EE90' : '#87CEEB',
        TechnicianId: task.assignedTechnicianId || task.TechnicianId || null
      }
    })

    return normalizeAndMergeSchedule(taskEvents, travelEvents)
  }, [localTasks, travelEvents, normalizeAndMergeSchedule])

  const onEventRendered = (args) => {
    const el = args.element
    const data = args.data
    const templateEl = el.querySelector('.e-template') || el
    if (templateEl) {
      templateEl.style.height = '100%'
      templateEl.style.overflow = 'visible'
    }

    if (data.status === 'TRAVEL') {
      el.style.backgroundColor = '#F5F5DC'
      el.style.border = '1px dashed #D2B48C'
      el.style.color = '#8B4513'
      el.style.fontSize = '11px'
      el.style.cursor = 'pointer'
      el.style.pointerEvents = 'auto'
      el.classList.add('travel-event')
      el.setAttribute('data-travel', 'true')
      return
    }

    if (data.status === 'KLADDE') {
      el.style.backgroundColor = '#87CEEB'
      el.style.border = '1px solid #5DADE2'
      el.style.color = '#000'
      el.classList.add('draft-task')
    } else if (data.status === 'PLANLAGT') {
      el.style.backgroundColor = '#90EE90'
      el.style.border = '1px solid #58D68D'
      el.style.color = '#000'
      el.classList.add('locked-task')
    }

    el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
    el.style.borderRadius = '6px'
  }

  const onDragStop = async (args) => {
    if (args?.data?.TaskId && onTaskUpdate) onTaskUpdate(args.data.TaskId, args.data.StartTime)
  }

  const onResizeStop = async (args) => {
    if (args.data?.TaskId) args.cancel = true
  }

  const onActionComplete = (args) => {
    if (args.requestType === 'eventChanged' && args.data?.TaskId && onTaskUpdate) {
      onTaskUpdate(args.data.TaskId, args.data.StartTime)
    }
  }

  const eventTemplate = (props) => {
    if (!props) return null
    if (props.status === 'TRAVEL') {
      return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
          🚗 {props.Duration} min • {props.Distance} km
        </div>
      )
    }
    return (
      <div style={{ padding: 6, height: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>#{props.TaskNumber}</div>
        <div style={{ fontSize: 11, color: '#222', marginTop: 4 }}>{props.CompanyName || props.Address}</div>
      </div>
    )
  }

  return (
    <div className="syncfusion-scheduler-wrapper" style={{ width: '100%' }}>
      <ScheduleComponent
        ref={scheduleRef}
        height={height}
        width="100%"
        selectedDate={new Date()}
        eventSettings={{
          dataSource: getScheduleData(),
          fields: {
            id: 'Id',
            subject: { name: 'Subject' },
            startTime: { name: 'StartTime' },
            endTime: { name: 'EndTime' }
          },
          template: eventTemplate,
          resourceIdField: 'TechnicianId'
        }}
        group={{ resources: ['Technicians'] }}
        dragStop={onDragStop}
        resizeStop={onResizeStop}
        actionComplete={onActionComplete}
        eventRendered={onEventRendered}
        currentView="Week"
        showQuickInfo={false}
        allowDragAndDrop={true}
        allowResizing={false}
        startHour="07:00"
        endHour="17:00"
        workHours={{ highlight: true, start: '07:00', end: '17:00' }}
        timeScale={{ enable: true, interval: 60, slotCount: 1 }}
        timeFormat="HH:mm"
        dateFormat="dd/MM/yyyy"
        firstDayOfWeek={1}
        cssClass="smartrep-schedule"
        showHeaderBar={true}
        showTimeIndicator={true}
        rowAutoHeight={false}
      >
        <ViewsDirective>
          <ViewDirective option="Day" />
          <ViewDirective option="Week" />
          <ViewDirective option="WorkWeek" />
        </ViewsDirective>

        <ResourcesDirective>
          <ResourceDirective
            field="TechnicianId"
            title="Tekniker"
            name="Technicians"
            allowMultiple={false}
            dataSource={resourceData}
            textField="Text"
            idField="Id"
            colorField="Color"
          />
        </ResourcesDirective>

        <Inject services={[Day, Week, WorkWeek, DragAndDrop, Resize]} />
      </ScheduleComponent>
    </div>
  )
}
