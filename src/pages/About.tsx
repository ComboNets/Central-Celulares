import { Navbar } from "@/components/Navbar";
import { MapPin, PhoneCall, Clock, Mail } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="main-content">
        <div className="container">
          <section className="mb-12">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Sobre Nosotros</h1>
            <p className="text-lg text-muted-foreground mb-4">
              Tu tienda de confianza en Paraguay.
            </p>
            <p className="text-sm md:text-base text-muted-foreground whitespace-pre-line">
              {"¡Bienvenidos a Central Celulares!\n\nCon más de 20 años de experiencia en el mercado, Central Celulares se ha establecido como un referente en la venta de celulares, accesorios y servicios en Caaguazú. Ubicados en la avenida Bernardino Caballero esquina Roberto L Petit, nuestro equipo está comprometido con brindar la mejor atención y los mejores productos a nuestros clientes.\n\nNuestra oferta:\n\n• Venta de celulares de las mejores marcas\n• Accesorios y repuestos para todos los modelos\n• Servicios técnicos especializados\n• Venta de productos informáticos\n\n¿Por qué elegirnos?\n\n• Más de 20 años de experiencia en el mercado\n• Personal capacitado y atento\n• Excelentes precios y promociones"}
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-card rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-2">📱</div>
              <h3 className="font-semibold mb-1">Nuestra Misión</h3>
              <p className="text-sm text-muted-foreground">
                Brindar acceso a la mejor tecnología móvil con precios justos y atención personalizada para cada cliente.
              </p>
            </div>
            <div className="bg-card rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-2">⭐</div>
              <h3 className="font-semibold mb-1">Nuestra Visión</h3>
              <p className="text-sm text-muted-foreground">
                Ser la tienda líder en dispositivos móviles en Paraguay, reconocidos por nuestra confiabilidad y servicio excepcional.
              </p>
            </div>
            <div className="bg-card rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold mb-1">Nuestros Valores</h3>
              <p className="text-sm text-muted-foreground">
                Honestidad, calidad, compromiso con el cliente y pasión por la tecnología son los pilares de nuestro negocio.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <div className="max-w-lg mx-auto text-center space-y-2 text-sm md:text-base text-muted-foreground">
              <h2 className="font-display text-2xl font-bold mb-3">Ubicación y Contacto</h2>
              <p><MapPin className="inline-block w-4 h-4 mr-2 text-primary" />Dirección: Calle Principal 123, Asunción, Paraguay</p>
              <p><PhoneCall className="inline-block w-4 h-4 mr-2 text-primary" />Teléfono: +595 21 123 4567</p>
              <p><Mail className="inline-block w-4 h-4 mr-2 text-primary" />Email: info@centralcelulares.com</p>
              <p><Clock className="inline-block w-4 h-4 mr-2 text-primary" />Horario: Lunes a Sábado, 9:00 AM - 8:00 PM</p>
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