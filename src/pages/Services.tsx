import { Navbar } from "@/components/Navbar";

export default function Services() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="main-content">
        <div className="container">
          <section className="mb-12 max-w-2xl">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Servicios</h1>
            <p className="text-lg text-muted-foreground mb-4">
              Reparaciones y soluciones para tu dispositivo.
            </p>
            <p className="text-sm md:text-base text-muted-foreground">
              En Central Celulares ofrecemos diferentes servicios para que tu teléfono siempre esté como nuevo. Trabajamos con repuestos de calidad y técnicos especializados.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
            <div className="bg-card rounded-xl p-5 shadow-sm" id="service-0">
              <div className="text-3xl mb-2">📱</div>
              <h3 className="font-semibold mb-1">Cambio de pantalla</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Reemplazamos pantallas rotas o dañadas para la mayoría de las marcas y modelos. Utilizamos repuestos de alta calidad y garantizamos un resultado limpio y funcional.
              </p>
            </div>

            <div className="bg-card rounded-xl p-5 shadow-sm" id="service-1">
              <div className="text-3xl mb-2">🔌</div>
              <h3 className="font-semibold mb-1">Reparación de puerto de carga</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Si tu teléfono ya no carga bien o hay que mover el cable para que funcione, revisamos y reparamos el puerto de carga o lo reemplazamos si es necesario.
              </p>
            </div>

            <div className="bg-card rounded-xl p-5 shadow-sm" id="service-2">
              <div className="text-3xl mb-2">🔋</div>
              <h3 className="font-semibold mb-1">Cambio de batería</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                ¿La batería ya no dura como antes? Cambiamos baterías desgastadas para que vuelvas a disfrutar de una buena autonomía durante todo el día.
              </p>
            </div>

            <div className="bg-card rounded-xl p-5 shadow-sm" id="service-3">
              <div className="text-3xl mb-2">🎧</div>
              <h3 className="font-semibold mb-1">Accesorios y cargadores</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Contamos con cargadores, cables, fundas, protectores de pantalla, auriculares y más accesorios originales y de buena calidad para tu dispositivo.
              </p>
            </div>

            <div className="bg-card rounded-xl p-5 shadow-sm" id="service-4">
              <div className="text-3xl mb-2">🛠️</div>
              <h3 className="font-semibold mb-1">Otros servicios</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                También ofrecemos limpieza interna, cambio de micrófono y parlante, actualización de software y revisión general del equipo.
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <h2 className="font-display text-2xl font-bold mb-3">¿Cómo trabajamos?</h2>
              <p className="text-sm md:text-base text-muted-foreground whitespace-pre-line">
                {"Traé tu dispositivo a nuestro local y uno de nuestros técnicos revisará el problema.\nTe informamos el costo aproximado, el tiempo de reparación y las opciones de repuesto disponibles antes de comenzar el trabajo."}
              </p>
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold mb-3">Consultas y presupuestos</h2>
              <div className="space-y-2 text-sm md:text-base text-muted-foreground">
                <p>Podés escribirnos por WhatsApp para consultar precios de reparaciones específicas.</p>
                <p>Traé tu cargador, cable o accesorio dañado y te ayudamos a encontrar la mejor opción de reemplazo.</p>
                <p>Siempre te avisamos si la reparación vale la pena en relación al valor actual del equipo.</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t py-12 bg-[#F8F9FA] text-gray-700">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Central Celulares · Caaguazú, Paraguay
          </p>
        </div>
      </footer>
    </div>
  );
}