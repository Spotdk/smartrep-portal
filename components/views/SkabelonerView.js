'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, ExternalLink, ClipboardCheck, Wrench, Camera } from 'lucide-react'
import { BRAND_BLUE } from '@/lib/constants'

const TEMPLATES = [
  {
    id: 'ordrebekraeftelse',
    title: 'Ordrebekræftelser',
    description: 'Vis alle 4 typer ordrebekræftelser med dummydata.',
    icon: ClipboardCheck,
    items: [
      { label: 'Standard', path: '/confirm/demo-standard' },
      { label: 'Udvidet serviceområde', path: '/confirm/demo-udvidet' },
      { label: 'Glas (særlige vilkår)', path: '/confirm/demo-glas' },
      { label: 'Kemisk afrensning', path: '/confirm/demo-kemisk' }
    ]
  },
  {
    id: 'arbejdskort',
    title: 'Arbejdskort',
    description: 'Forhåndsvisning af arbejdskort med dummydata.',
    icon: Wrench,
    items: [
      { label: 'Arbejdskort', path: '/arbejdskort/demo' }
    ]
  },
  {
    id: 'fotorapport',
    title: 'Fotorapport',
    description: 'Forhåndsvisning af fotorapport (kundegennemgang) med dummydata.',
    icon: Camera,
    items: [
      { label: 'Fotorapport', path: '/fotorapport/demo' }
    ]
  }
]

export default function SkabelonerView() {
  const openTemplate = (path) => {
    if (typeof window !== 'undefined') {
      window.open(`${window.location.origin}${path}`, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7" style={{ color: BRAND_BLUE }} />
          Skabeloner
        </h2>
        <p className="text-gray-500 mt-1">
          Åbn rapporter og ordrebekræftelser med dummydata for at se layout og indhold. &quot;Vis&quot; åbner i nyt faneblad.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        {TEMPLATES.map((group) => (
          <Card key={group.id}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gray-100" style={{ color: BRAND_BLUE }}>
                  <group.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900">{group.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {group.items.map((item) => (
                      <Button
                        key={item.path}
                        variant="outline"
                        size="sm"
                        onClick={() => openTemplate(item.path)}
                        className="gap-2"
                        style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Vis {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
