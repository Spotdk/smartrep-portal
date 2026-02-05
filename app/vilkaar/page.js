'use client'

import Link from 'next/link'

const BRAND_BLUE = '#0052FF'
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_d53681bc-c820-4c8d-b1f0-b0733d8a656e/artifacts/fi97k95c_SMARTREP_Cirkel_2_sort.png'

export default function VilkaarPage() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/" className="inline-block">
            <img src={LOGO_URL} alt="SMARTREP" className="h-10 w-auto" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 md:p-8">
            <h1 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-100 pb-3 mb-6">
              SMARTREPs standardvilkår for lakeringsydelser og reklamation
            </h1>
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-4">FINISH TIL BYGGEBRANCHEN</p>

            <div className="prose prose-gray max-w-none text-gray-700 space-y-4">
              <p>
                Her kan I læse SMARTREPs gældende vilkår for lakeringsydelser og reklamation. Ved at acceptere ordrebekræftelsen accepterer I disse vilkår.
              </p>
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">1. Omfang</h2>
                <p>
                  Vilkårene gælder for alle ydelser leveret af SMARTREP ApS vedrørende lakering, reparation og finish til byggebranchen.
                </p>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">2. Priser og betaling</h2>
                <p>
                  Priser følger den aftalte ordrebekræftelse og gældende prisliste. Fakturering sker efter gennemført arbejde med angivet betalingsfrist.
                </p>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">3. Reklamation</h2>
                <p>
                  Reklamationer skal anmeldes uden unødig venten. SMARTREP vurderer reklamationen og retter eller erstatter efter aftale ved dokumenteret mangel.
                </p>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">4. Ansvarsbegrænsning</h2>
                <p>
                  SMARTREP er ikke ansvarlig for indirekte tab. Erstatningsansvar er begrænset til det beløb, der svarer til den berørte ydelse.
                </p>
              </section>
            </div>

            <div className="mt-10 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
              <p>Spørgsmål? Kontakt os på 82 82 25 72 eller info@smartrep.nu</p>
              <Link href="/" className="inline-block mt-4 text-blue-600 hover:underline font-medium">
                ← Tilbage til portalen
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
