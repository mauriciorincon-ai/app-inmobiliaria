// Texto nuevo de /privacidad desde el S4: nace como mapa { es, en } (regla de producto 10). La
// página es monolingüe hasta H-2 y pinta `es`; el test de paridad impide que `en` quede vacío o
// sea una copia del español.
export type TextoBilingue = { es: string; en: string };

// Dice solo lo que el código hace: el correo del paso 3 sirve para los avisos de campaña
// (`engine/envios/plantillas.ts`: fotos, sello, vigencia) y los envía un proveedor de correo
// (`lib/brevo.ts`) que recibe correo y nombre. El paquete fundador NO se envía por correo: se
// sirve como enlaces en la página (ADR 010).
export const CORREO_OPCIONAL: TextoBilingue = {
  es: "El correo electrónico es opcional. Si lo das en el último paso del registro, lo usamos solo para enviarte avisos sobre tu publicación, por ejemplo completar las fotos, ganar el sello de propietario verificado o renovar la vigencia. Si lo dejas vacío, te escribimos únicamente por WhatsApp. Los avisos salen a través de un proveedor de correo que actúa por encargo nuestro y recibe tu correo y tu nombre solo para hacer ese envío. Puedes pedirnos que dejemos de enviarte avisos o que borremos tu correo cuando quieras, escribiendo al correo del responsable indicado arriba.",
  en: "Your email is optional. If you give it in the last step of registration, we use it only to send you notices about your listing, for example to add photos, earn the verified-owner seal or renew its validity. If you leave it empty, we contact you by WhatsApp only. The notices go out through an email provider that acts on our behalf and receives your email and name only to send them. You can ask us to stop sending notices, or to delete your email, at any time by writing to the controller's address above.",
};
