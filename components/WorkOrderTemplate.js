'use client'

import { QRCodeSVG } from 'qrcode.react'
import { CloudRain, Sun, CloudSun } from 'lucide-react'

export default function WorkOrderTemplate({ data, logoUrl }) {
  // Default values
  const taskNumber = data?.taskNumber || "000"
  const companyName = data?.companyName || "-"
  const contactPerson = data?.contactPerson || "-"
  const address = data?.address || "-"
  const mobile = data?.mobile || "-"
  const bygherre1Name = data?.bygherre1Name || "-"
  const bygherre1Mobile = data?.bygherre1Mobile || "-"
  const bygherre2Name = data?.bygherre2Name || ""
  const bygherre2Mobile = data?.bygherre2Mobile || ""
  const deadline = data?.deadline || "-"
  const deliveryDate = data?.deliveryDate || "-"
  const preDeliveryDate = data?.preDeliveryDate || "-"
  const emptyHouse = data?.emptyHouse ?? false
  const plannedExecutionWeekday = data?.plannedExecutionWeekday || ""
  const plannedExecution = data?.plannedExecution || "-"
  const estimatedTime = data?.estimatedTime || "-"
  const categoryTypes = data?.categoryTypes || []
  const weather = data?.weather || 'sun'
  const damages = data?.damages || []
  const photos = data?.photos || []
  const totalPages = data?.totalPages || 2
  const currentPage = data?.currentPage || 1
  
  // All possible category types
  const allCategoryTypes = ['PLA', 'BUN', 'GLA', 'ALU', 'TRÆ', 'COA', 'INS', 'REN']
  
  return (
    <div className="max-w-[210mm] mx-auto bg-white">
      {/* PAGE 1 */}
      <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm]" style={{ pageBreakAfter: 'always' }}>
        <div className="p-8 flex flex-col h-full">
          
          {/* Header Section */}
          <div className="flex items-start justify-between mb-4 border-b-4 border-blue-600 pb-4 flex-shrink-0">
            <div className="flex-1">
              <div className="space-y-2 mb-4">
                <h1 className="tracking-wider text-gray-700 text-4xl font-bold">ARBEJDSKORT</h1>
                <p className="text-gray-600 text-xl">#313-{taskNumber}</p>
              </div>
              
              {/* Kunde and Kontakt info */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div>
                  <p className="text-gray-500">Kunde:</p>
                  <p className="text-gray-900 font-medium">{companyName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Kontakt:</p>
                  <p className="text-gray-900 font-medium">{contactPerson}</p>
                </div>
                <div>
                  <p className="text-gray-500">Adresse:</p>
                  <p className="text-gray-900 font-medium">{address}</p>
                </div>
                <div>
                  <p className="text-gray-500">Mobil:</p>
                  <p className="text-gray-900 font-medium">{mobile}</p>
                </div>
              </div>
            </div>
            
            {/* Logo and QR Code */}
            <div className="flex flex-col items-center gap-4">
              {logoUrl ? (
                <img src={logoUrl} alt="SMARTREP" className="h-16" />
              ) : (
                <div className="h-16 flex items-center">
                  <span className="text-2xl font-bold text-blue-600">SMARTREP</span>
                </div>
              )}
              
              <QRCodeSVG 
                value={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://smartrep.nu'}/tekniker/opgave/${data?.taskId || taskNumber}`}
                size={100}
                level="H"
                includeMargin={false}
              />
            </div>
          </div>

          {/* Bygherre Information Box */}
          <div className="border-2 border-gray-300 rounded-lg p-3 mb-3 bg-gray-50 flex-shrink-0">
            <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Bygherre 1:</p>
                <p className="text-gray-900 font-medium">{bygherre1Name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Mobil 1:</p>
                <p className="text-gray-900 font-medium">{bygherre1Mobile}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Bygherre 2:</p>
                <p className="text-gray-900 font-medium">{bygherre2Name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Mobil 2:</p>
                <p className="text-gray-900 font-medium">{bygherre2Mobile || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Deadline:</p>
                <p className="text-gray-900 font-medium">{deadline}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Afleveringsdato:</p>
                <p className="text-gray-900 font-medium">{deliveryDate}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Foraflevering:</p>
                <p className="text-gray-900 font-medium">{preDeliveryDate}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Tomt hus?</p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1">
                    <input type="radio" name="empty-house" className="w-3 h-3" checked={emptyHouse} readOnly />
                    <span className="text-gray-900 text-sm">Ja</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="empty-house" className="w-3 h-3" checked={!emptyHouse} readOnly />
                    <span className="text-gray-900 text-sm">Nej</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Status Information Box */}
          <div className="border-2 border-gray-300 rounded-lg p-3 mb-3 bg-gray-50 flex-shrink-0">
            <div className="flex flex-col gap-2">
              <div className="flex gap-6">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm mb-1">Planlagt udførsel</p>
                  <p className="text-gray-700">{plannedExecutionWeekday ? `${plannedExecutionWeekday}. ` : ''}{plannedExecution}</p>
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 text-xs">Estimeret tid:</p>
                  <p className="text-gray-900 font-medium">{estimatedTime}</p>
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 text-xs mb-1 text-center">Vejr:</p>
                  <div className="flex items-center justify-center gap-3">
                    <label className="flex items-center gap-1">
                      <input type="radio" name="weather" className="w-3 h-3" checked={weather === 'rain'} readOnly />
                      <CloudRain className="w-4 h-4 text-gray-600" />
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="radio" name="weather" className="w-3 h-3" checked={weather === 'sun'} readOnly />
                      <Sun className="w-4 h-4 text-yellow-500" />
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="radio" name="weather" className="w-3 h-3" checked={weather === 'combined' || weather === 'both'} readOnly />
                      <CloudSun className="w-4 h-4 text-gray-600" />
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Type:</p>
                <div className="grid grid-cols-4 gap-x-4 gap-y-1">
                  {allCategoryTypes.map((type) => (
                    <label key={type} className="flex items-center gap-1.5">
                      <input 
                        type="checkbox" 
                        className="w-3.5 h-3.5 border-2 border-gray-400" 
                        checked={categoryTypes.includes(type) || data?.taskType === type}
                        readOnly 
                      />
                      <span className="text-gray-900 text-sm font-medium">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Blue divider line */}
          <div className="border-b-2 border-blue-600 mb-3 flex-shrink-0"></div>

          {/* Damages Section */}
          <div className="flex-1 min-h-0">
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              {/* Header Row */}
              <div className="flex bg-gray-100 border-b-2 border-gray-300">
                <div className="w-14 p-2 border-r-2 border-gray-300 flex items-center justify-center">
                  <p className="text-gray-700 text-xs font-medium">Udført</p>
                </div>
                <div className="flex-1 p-2 border-r-2 border-gray-300">
                  <p className="text-gray-700 text-sm font-medium">Beskrivelse</p>
                </div>
                <div className="w-48 p-2">
                  <p className="text-blue-600 text-sm font-medium">Noter</p>
                </div>
              </div>
              
              {/* Damage Rows */}
              {damages.length > 0 ? damages.map((damage, index) => (
                <div key={index} className={`flex ${index < damages.length - 1 ? 'border-b border-gray-300' : ''}`}>
                  <div className="w-14 p-3 border-r-2 border-gray-300 flex items-start justify-center">
                    <div className="w-4 h-4 border-2 border-gray-400 rounded"></div>
                  </div>
                  <div className="flex-1 p-3 border-r-2 border-gray-300">
                    <p className="text-gray-900 text-sm mb-1">
                      <span className="font-semibold">Skade {damage.number || index + 1}:</span> {damage.buildingPart || damage.part || '-'}
                    </p>
                    <p className="text-gray-700 text-xs">
                      Antal: {damage.quantity || 1} / Placering: {damage.location || '-'} / Farve: {damage.color || '-'}
                    </p>
                  </div>
                  <div className="w-48 p-3">
                    <p className="text-gray-700 text-xs">{damage.notes || ''}</p>
                  </div>
                </div>
              )) : (
                <div className="p-4 text-center text-gray-400">
                  Ingen skader registreret
                </div>
              )}
            </div>
          </div>

          {/* Page Number */}
          <div className="text-right text-gray-500 text-sm mt-4 flex-shrink-0">
            Side {currentPage} af {totalPages}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t-2 border-gray-300 mt-auto flex-shrink-0">
            <p className="text-gray-600 text-center text-sm">SMARTREP ApS - www.smartrep.nu - tlf. 8282 2572 - info@smartrep.nu</p>
          </div>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm]" style={{ pageBreakBefore: 'always' }}>
        <div className="p-8 flex flex-col h-full" style={{ minHeight: '277mm' }}>
          
          {/* Photos Section */}
          <div className="flex-1 mb-6">
            <h3 className="mb-4 text-blue-600 font-semibold border-b-2 border-blue-600 pb-2">Fotos</h3>
            <div className="border-2 border-gray-300 rounded bg-white p-4" style={{ minHeight: '400px' }}>
              {photos && photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="aspect-square border border-gray-200 rounded overflow-hidden">
                      <img 
                        src={photo.url || photo} 
                        alt={photo.caption || `Skade foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">Ingen fotos tilgængelige</p>
                </div>
              )}
            </div>
          </div>

          {/* Signature Field */}
          <div className="mt-auto pt-6 border-t-2 border-gray-300 flex-shrink-0">
            <h3 className="mb-6 text-blue-600 font-semibold">SMARTREP Underskrift</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-gray-600 mb-2">Dato:</p>
                <div className="border-b-2 border-gray-400 pb-2 mb-4"></div>
              </div>
              <div>
                <p className="text-gray-600 mb-2">Signatur:</p>
                <div className="border-b-2 border-gray-400 pb-2 mb-4"></div>
              </div>
            </div>
          </div>

          {/* Page Number */}
          <div className="text-right text-gray-500 text-sm mt-6 flex-shrink-0">
            Side 2 af 2
          </div>

          {/* Footer */}
          <div className="pt-6 border-t-2 border-gray-300 flex-shrink-0">
            <p className="text-gray-600 text-center text-sm">SMARTREP ApS - www.smartrep.nu - tlf. 8282 2572 - info@smartrep.nu</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}
