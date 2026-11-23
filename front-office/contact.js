// Call / WhatsApp / SMS / e-mail buttons, inlined into index.html by sync.js (config: window.SITE_CONTACT).
// Links are built when clicked so the pre-filled message follows the current language and vehicle.
(() => {
  const MESSAGES = {
    fr: {
      car: (brand, car, price, url) => `Bonjour ${brand}, je suis intéressé(e) par ce véhicule : ${car} — ${price} TND.\n${url}`,
      general: brand => `Bonjour ${brand}, je souhaite des informations sur vos véhicules et l'importation jusqu'à Tunis.`,
      subject: car => car ? `Demande d'information — ${car}` : "Demande d'information"
    },
    en: {
      car: (brand, car, price, url) => `Hello ${brand}, I'm interested in this vehicle: ${car} — ${price} TND.\n${url}`,
      general: brand => `Hello ${brand}, I'd like information about your vehicles and delivery to Tunis.`,
      subject: car => car ? `Information request — ${car}` : 'Information request'
    },
    ar: {
      car: (brand, car, price, url) => `مرحبًا ${brand}، أنا مهتم بهذه السيارة: ${car} — ${price} د.ت.\n${url}`,
      general: brand => `مرحبًا ${brand}، أرغب في الحصول على معلومات حول سياراتكم والتوصيل إلى تونس.`,
      subject: car => car ? `طلب معلومات — ${car}` : 'طلب معلومات'
    }
  };

  function buildHref(link) {
    const contact = window.SITE_CONTACT || {};
    const lang = MESSAGES[document.documentElement.lang] ? document.documentElement.lang : 'fr';
    const texts = MESSAGES[lang];
    const car = link.closest('[data-contact-car]') ? window.siteCurrentCar : null;
    const carLabel = car ? `${car.name}${car.trim ? ' ' + car.trim : ''} (${car.year})` : '';
    const url = car ? `${location.origin}${location.pathname}?screen=vehicule&id=${encodeURIComponent(car.id)}` : '';
    const price = car ? new Intl.NumberFormat('fr-FR').format(car.price).replace(/\s/g, ' ') : '';
    const message = car ? texts.car(contact.brand, carLabel, price, url) : texts.general(contact.brand);
    const phone = String(contact.phone || '').replace(/[^\d+]/g, '');
    const whatsapp = String(contact.whatsapp || contact.phone || '').replace(/\D/g, '');
    switch (link.dataset.contact) {
      case 'call': return `tel:${phone}`;
      case 'whatsapp': return `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
      // "?&body=" is understood by both iOS and Android messaging apps.
      case 'sms': return `sms:${phone}?&body=${encodeURIComponent(message)}`;
      case 'email': return `mailto:${contact.email}?subject=${encodeURIComponent(texts.subject(carLabel))}&body=${encodeURIComponent(message)}`;
    }
    return link.href;
  }

  const refresh = () => document.querySelectorAll('[data-contact]').forEach(link => { link.href = buildHref(link); });
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-contact]');
    if (link) link.href = buildHref(link);
  }, true);
  document.addEventListener('DOMContentLoaded', () => {
    refresh();
    new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  });
})();
