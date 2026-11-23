// FR / EN / AR language switcher, loaded by index.html (/i18n.js) and inlined into front-office/index.html by sync.js.
// The page is written in French; each displayed French string (text or placeholder/aria-label/title/alt)
// is looked up in DICT, then in PATTERNS for strings containing variables (prices, km, names…).
(() => {
  const LANGS = ['fr', 'en', 'ar'];
  const STORAGE_KEY = 'primecars-lang';
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];

  // French text -> [English, Arabic]
  const DICT = {
    'Prime Cars — Voitures neuves et d’occasion de France et des Émirats arabes unis à Tunis': ['Prime Cars — New and used cars from France and the United Arab Emirates to Tunis', 'Prime Cars — سيارات جديدة ومستعملة من فرنسا والإمارات العربية المتحدة إلى تونس'],
    // Header & navigation
    "De Dubaï & de France, jusqu'à Tunis.": ['From Dubai & France, all the way to Tunis.', 'من دبي وفرنسا، حتى تونس.'],
    'Des véhicules sélectionnés. Un accompagnement à chaque étape.': ['Hand-picked vehicles. Support at every step.', 'سيارات مختارة بعناية. ومرافقة في كل مرحلة.'],
    'Accueil': ['Home', 'الرئيسية'],
    'Nos véhicules': ['Our vehicles', 'سياراتنا'],
    'Importation & livraison': ['Import & delivery', 'الاستيراد والتوصيل'],
    'Vos questions': ['FAQ', 'أسئلتكم'],
    'Parlons de votre projet': ["Let's talk about your project", 'لنتحدث عن مشروعك'],
    'Être accompagné': ['Get support', 'اطلب المرافقة'],
    'Ouvrir le menu': ['Open menu', 'افتح القائمة'],
    'Menu': ['Menu', 'القائمة'],
    // Home
    "L'automobile, sans frontières.": ['Cars, without borders.', 'السيارات، بلا حدود.'],
    'Votre prochaine': ['Your next car', 'سيارتك القادمة'],
    'voiture vous attend.': ['is waiting for you.', 'بانتظارك.'],
    "Neuve ou d'occasion, trouvez celle qui vous correspond. Nous l'acheminons de France ou de Dubaï jusqu'à Tunis.": ['New or used, find the one that suits you. We ship it from France or Dubai all the way to Tunis.', 'جديدة أو مستعملة، اختر السيارة التي تناسبك. ونحن ننقلها من فرنسا أو دبي حتى تونس.'],
    'Explorer les véhicules': ['Explore vehicles', 'استكشف السيارات'],
    'Voiture sportive photographiée de trois quarts': ['Sports car photographed from a three-quarter angle', 'سيارة رياضية مصوّرة من زاوية جانبية أمامية'],
    'Le plaisir commence ici.': ['The pleasure starts here.', 'المتعة تبدأ من هنا.'],
    'Votre envie': ['What you want', 'رغبتك'],
    'Neuf & occasion': ['New & used', 'جديدة ومستعملة'],
    'Véhicule neuf': ['New vehicle', 'سيارة جديدة'],
    "Véhicule d'occasion": ['Used vehicle', 'سيارة مستعملة'],
    'Marque': ['Brand', 'العلامة'],
    'Toutes les marques': ['All brands', 'كل العلامات'],
    'Budget maximum': ['Maximum budget', 'الميزانية القصوى'],
    'Tous les budgets': ['Any budget', 'كل الميزانيات'],
    'Provenance': ['Origin', 'المصدر'],
    'Toutes les origines': ['All origins', 'كل المصادر'],
    'France': ['France', 'فرنسا'],
    'Dubaï': ['United Arab Emirates', 'الإمارات العربية المتحدة'],
    'Tunis': ['Tunis', 'تونس'],
    'Rechercher': ['Search', 'بحث'],
    'Nom du véhicule': ['Vehicle name', 'اسم السيارة'],
    'Ex. BMW Série 1': ['e.g. BMW 1 Series', 'مثال: BMW الفئة 1'],
    'Sélection & contrôle des véhicules': ['Vehicle selection & inspection', 'اختيار السيارات وفحصها'],
    'Démarches accompagnées': ['Assisted paperwork', 'مرافقة في الإجراءات'],
    "Livraison jusqu'à Tunis": ['Delivery to Tunis', 'التوصيل حتى تونس'],
    'Un interlocuteur dédié': ['A dedicated advisor', 'مستشار مخصّص لك'],
    'Nos directs': ['Our live streams', 'بثّنا المباشر'],
    'Le live apparaîtra ici': ['The live stream will appear here', 'سيظهر البث المباشر هنا'],
    'Retrouvez nos présentations de véhicules en direct.': ['Watch our vehicle presentations live.', 'تابعوا عروض سياراتنا مباشرة.'],
    'Une sélection qui donne envie.': ["A selection you'll love.", 'تشكيلة تثير الرغبة.'],
    'Des modèles choisis pour leur état, leur équipement et leur caractère.': ['Models chosen for their condition, equipment and character.', 'طرازات مختارة لحالتها وتجهيزاتها وطابعها.'],
    'Tous': ['All', 'الكل'],
    'Neufs': ['New', 'جديدة'],
    'Occasions': ['Used', 'مستعملة'],
    'Découvrir tout le catalogue': ['See the full catalogue', 'اكتشف الكتالوج كاملًا'],
    'Suivez-nous.': ['Follow us.', 'تابعونا.'],
    'Nos derniers arrivages, en posts et en reels.': ['Our latest arrivals, in posts and reels.', 'أحدث وصولاتنا، في منشورات ومقاطع ريلز.'],
    'Publication de test': ['Test post', 'منشور تجريبي'],
    'Découvrir ce véhicule': ['Discover this vehicle', 'اكتشف هذه السيارة'],
    'Vous choisissez. Nous organisons.': ['You choose. We organise.', 'أنت تختار. ونحن ننظّم.'],
    "D'ailleurs à chez vous.": ['From abroad to your door.', 'من الخارج إلى باب بيتك.'],
    "Achat, transport et formalités : votre projet d'importation prend forme.": ['Purchase, shipping and paperwork: your import project takes shape.', 'الشراء والنقل والإجراءات: مشروع استيرادك يتجسّد.'],
    'Dubaï / France': ['United Arab Emirates / France', 'الإمارات العربية المتحدة / فرنسا'],
    'Estimer ma livraison': ['Estimate my delivery', 'قدّر تكلفة التوصيل'],
    // Live & social
    'EN DIRECT': ['LIVE', 'مباشر'],
    'Nous sommes en live.': ["We're live.", 'نحن في بث مباشر.'],
    'Nous sommes en live sur Instagram.': ["We're live on Instagram.", 'نحن في بث مباشر على إنستغرام.'],
    'Nous sommes en live sur TikTok.': ["We're live on TikTok.", 'نحن في بث مباشر على تيك توك.'],
    'Ouvrir la publication ↗': ['Open post ↗', 'فتح المنشور ↗'],
    'Rejoignez-nous pour découvrir nos véhicules en direct.': ['Join us to discover our vehicles live.', 'انضموا إلينا لاكتشاف سياراتنا مباشرة.'],
    'Regarder le live': ['Watch the live', 'شاهد البث المباشر'],
    // Vehicle cards
    'Neuf': ['New', 'جديدة'],
    'Occasion': ['Used', 'مستعملة'],
    'Réservé': ['Reserved', 'محجوزة'],
    'Livraison à Tunis': ['Delivery to Tunis', 'التوصيل إلى تونس'],
    'Diesel': ['Diesel', 'ديزل'],
    'Essence': ['Petrol', 'بنزين'],
    'Hybride': ['Hybrid', 'هجينة'],
    'Électrique': ['Electric', 'كهربائية'],
    'Auto.': ['Auto.', 'أوتوماتيك'],
    'TND': ['TND', 'د.ت'],
    "Hors frais d'importation": ['Excl. import costs', 'دون مصاريف الاستيراد'],
    // Catalogue
    'Le bon véhicule. Au bon endroit.': ['The right vehicle. In the right place.', 'السيارة المناسبة. في المكان المناسب.'],
    'Trouvez votre prochain départ.': ['Find your next ride.', 'ابحث عن انطلاقتك القادمة.'],
    "Neufs ou d'occasion, de France ou de Dubaï. Tous les chemins mènent à votre prochaine voiture.": ['New or used, from France or Dubai. Every road leads to your next car.', 'جديدة أو مستعملة، من فرنسا أو دبي. كل الطرق تؤدي إلى سيارتك القادمة.'],
    'Affiner la sélection': ['Refine the selection', 'تصفية النتائج'],
    'Réinitialiser les filtres': ['Reset filters', 'إعادة ضبط الفلاتر'],
    'État du véhicule': ['Vehicle condition', 'حالة السيارة'],
    'Motorisation': ['Engine', 'المحرك'],
    'Une recherche précise ?': ['Looking for something specific?', 'تبحث عن سيارة محددة؟'],
    'Parlons du véhicule que vous avez en tête.': ["Let's talk about the vehicle you have in mind.", 'لنتحدث عن السيارة التي تفكر فيها.'],
    'Confier ma recherche': ['Let us search for you', 'كلّفنا بالبحث'],
    'à découvrir': ['to discover', 'للاكتشاف'],
    'Tri : notre sélection': ['Sort: our selection', 'الترتيب: اختيارنا'],
    'Prix croissant': ['Price: low to high', 'السعر: من الأقل إلى الأعلى'],
    'Prix décroissant': ['Price: high to low', 'السعر: من الأعلى إلى الأقل'],
    'Livraison à Tunis disponible': ['Delivery to Tunis available', 'التوصيل إلى تونس متاح'],
    'Prix hors importation': ['Prices excl. import', 'الأسعار دون الاستيراد'],
    "Aucun véhicule ne correspond à ces critères. Essayez d'élargir votre recherche.": ['No vehicle matches these criteria. Try broadening your search.', 'لا توجد سيارة تطابق هذه المعايير. جرّب توسيع بحثك.'],
    'Filtrer par marque': ['Filter by brand', 'التصفية حسب العلامة'],
    'Budget maximum en dinars': ['Maximum budget in dinars', 'الميزانية القصوى بالدينار'],
    'Trier les véhicules': ['Sort vehicles', 'ترتيب السيارات'],
    // Vehicle page
    'Description du véhicule': ['Vehicle description', 'وصف السيارة'],
    'Occasion sélectionnée': ['Selected used car', 'سيارة مستعملة مختارة'],
    'Sauvegarder': ['Save', 'حفظ'],
    "Photo d'inspiration": ['Inspiration photo', 'صورة توضيحية'],
    "Galerie d'ambiance": ['Mood gallery', 'معرض الصور'],
    'Mercedes-Benz sélectionnée': ['Selected Mercedes-Benz', 'مرسيدس-بنز مختارة'],
    'Vue extérieure': ['Exterior view', 'منظر خارجي'],
    'Vue de la Mercedes': ['View of the Mercedes', 'منظر المرسيدس'],
    'Vue de profil': ['Side view', 'منظر جانبي'],
    'Profil automobile': ['Car profile', 'جانب السيارة'],
    'Détail automobile': ['Car detail', 'تفصيل السيارة'],
    "Détail d'une voiture sportive": ['Detail of a sports car', 'تفصيل سيارة رياضية'],
    'Autre inspiration': ['Another view', 'صورة أخرى'],
    'Autre vue automobile': ['Another car view', 'منظر آخر للسيارة'],
    'Caractéristiques': ['Specifications', 'المواصفات'],
    'Équipements': ['Equipment', 'التجهيزات'],
    'Historique': ['History', 'السجل'],
    'Mise en circulation': ['First registration', 'أول تسجيل'],
    'Kilométrage': ['Mileage', 'عدد الكيلومترات'],
    'Transmission': ['Gearbox', 'ناقل الحركة'],
    'Automatique': ['Automatic', 'أوتوماتيكي'],
    'Puissance': ['Power', 'القوة'],
    'Couleur': ['Colour', 'اللون'],
    'À confirmer': ['To be confirmed', 'يُحدَّد لاحقًا'],
    'Places': ['Seats', 'المقاعد'],
    '5 places': ['5 seats', '5 مقاعد'],
    "Une silhouette affirmée, un habitacle soigné et le plaisir de chaque trajet. Ce véhicule de démonstration illustre notre sélection. La configuration, l'état et les documents seront vérifiés avant toute proposition commerciale.": ['A bold silhouette, a refined cabin and the pleasure of every journey. This demonstration vehicle illustrates our selection. Configuration, condition and documents will be checked before any commercial offer.', 'تصميم واثق ومقصورة متقنة ومتعة في كل رحلة. هذه السيارة التجريبية تمثّل تشكيلتنا. سيتم التحقق من المواصفات والحالة والوثائق قبل أي عرض تجاري.'],
    'Configuration illustrative : navigation connectée, caméra de recul, climatisation automatique, aide au stationnement et régulateur de vitesse. Équipements à confirmer sur le véhicule proposé.': ['Illustrative configuration: connected navigation, reversing camera, automatic air conditioning, parking assist and cruise control. Equipment to be confirmed on the vehicle offered.', 'تجهيزات توضيحية: نظام ملاحة متصل، كاميرا خلفية، تكييف أوتوماتيكي، مساعد ركن ومثبّت سرعة. تُؤكَّد التجهيزات على السيارة المقترحة.'],
    "Le dossier d'entretien, le rapport de contrôle et les documents d'origine seront communiqués pour chaque véhicule réel. Aucun historique réel n'est associé à cette maquette.": ['The service record, inspection report and original documents will be provided for each real vehicle. No real history is attached to this mock-up.', 'سيتم تقديم سجل الصيانة وتقرير الفحص والوثائق الأصلية لكل سيارة حقيقية. لا يرتبط أي سجل حقيقي بهذا النموذج التجريبي.'],
    'Contrôle avant achat': ['Pre-purchase inspection', 'فحص قبل الشراء'],
    'Dossier documenté': ['Documented file', 'ملف موثّق'],
    'Transport organisé': ['Shipping arranged', 'نقل منظّم'],
    'Véhicule situé en France': ['Vehicle located in France', 'السيارة موجودة في فرنسا'],
    'Véhicule situé à Dubaï': ['Vehicle located in the United Arab Emirates', 'السيارة موجودة في الإمارات العربية المتحدة'],
    "Prix indicatif du véhicule, hors transport, taxes et formalités d'importation.": ['Indicative vehicle price, excluding shipping, taxes and import formalities.', 'سعر تقديري للسيارة، دون النقل والضرائب وإجراءات الاستيراد.'],
    'État': ['Condition', 'الحالة'],
    'Destination': ['Destination', 'الوجهة'],
    'Tunis, Tunisie': ['Tunis, Tunisia', 'تونس العاصمة، تونس'],
    'Transport estimatif': ['Estimated shipping', 'النقل التقديري'],
    "Votre voiture, jusqu'à Tunis.": ['Your car, all the way to Tunis.', 'سيارتك، حتى تونس.'],
    'Délais, éligibilité et frais confirmés après étude de votre dossier.': ['Lead times, eligibility and costs confirmed after reviewing your file.', 'تُؤكَّد الآجال والأهلية والتكاليف بعد دراسة ملفك.'],
    'Bloquer ce véhicule': ['Reserve this vehicle', 'احجز هذه السيارة'],
    'Réservez-le dès maintenant en versant un acompte de': ['Reserve it now by paying a deposit of', 'احجزها الآن بدفع عربون قدره'],
    "Payer l'acompte avec Stripe": ['Pay the deposit with Stripe', 'ادفع العربون عبر Stripe'],
    'Payer avec Mamo Pay': ['Pay with Mamo Pay', 'ادفع عبر Mamo Pay'],
    'Ce véhicule est déjà réservé.': ['This vehicle is already reserved.', 'هذه السيارة محجوزة بالفعل.'],
    'Téléphone': ['Phone', 'الهاتف'],
    'E-mail': ['Email', 'البريد الإلكتروني'],
    'Demander mon devis': ['Request my quote', 'اطلب عرض السعر'],
    'Échanger avec un conseiller': ['Talk to an advisor', 'تحدّث مع مستشار'],
    'Demande gratuite et sans engagement': ['Free, no-obligation request', 'طلب مجاني ودون أي التزام'],
    'Un projet, une prise en charge complète.': ['One project, full support.', 'مشروع واحد، تكفّل كامل.'],
    "De la sélection au départ, jusqu'à l'arrivée au port de Radès.": ['From selection and departure to arrival at the port of Radès.', 'من الاختيار والانطلاق حتى الوصول إلى ميناء رادس.'],
    "Découvrir l'importation": ['Discover importing', 'اكتشف خدمة الاستيراد'],
    // Import & delivery
    'De là-bas à Tunis.': ['From there to Tunis.', 'من هناك إلى تونس.'],
    "On s'occupe du trajet.": ['We handle the journey.', 'ونحن نتكفّل بالرحلة.'],
    "Votre véhicule en France ou à Dubaï, votre destination en Tunisie. Construisons un projet clair, de l'achat à l'arrivée.": ["Your vehicle in France or Dubai, your destination in Tunisia. Let's build a clear plan, from purchase to arrival.", 'سيارتك في فرنسا أو دبي، ووجهتك تونس. لنبنِ مشروعًا واضحًا، من الشراء حتى الوصول.'],
    'ou France': ['or France', 'أو فرنسا'],
    'VOTRE POINT DE DÉPART': ['YOUR STARTING POINT', 'نقطة انطلاقك'],
    'VOTRE DESTINATION': ['YOUR DESTINATION', 'وجهتك'],
    'Votre projet': ['Your project', 'مشروعك'],
    'Origine & véhicule': ['Origin & vehicle', 'المصدر والسيارة'],
    'Étude & devis': ['Review & quote', 'الدراسة وعرض السعر'],
    'Éligibilité & frais détaillés': ['Eligibility & detailed costs', 'الأهلية والتكاليف المفصّلة'],
    'Achat & transport': ['Purchase & shipping', 'الشراء والنقل'],
    'Organisation & suivi': ['Planning & tracking', 'التنظيم والمتابعة'],
    'Arrivée à Tunis': ['Arrival in Tunis', 'الوصول إلى تونس'],
    'Formalités & remise': ['Formalities & handover', 'الإجراءات والتسليم'],
    'Commençons par votre projet.': ["Let's start with your project.", 'لنبدأ بمشروعك.'],
    'Une première estimation, avant un devis adapté à votre situation.': ['A first estimate, before a quote tailored to your situation.', 'تقدير أولي، قبل عرض سعر يناسب وضعك.'],
    "D'où vient votre véhicule ?": ['Where is your vehicle coming from?', 'من أين تأتي سيارتك؟'],
    'Transport maritime': ['Sea freight', 'نقل بحري'],
    'Type de véhicule': ['Vehicle type', 'نوع السيارة'],
    'Berline / citadine': ['Saloon / city car', 'سيدان / سيارة مدينة'],
    'SUV / 4×4': ['SUV / 4×4', 'SUV / دفع رباعي'],
    "Valeur d'achat (TND)": ['Purchase value (TND)', 'قيمة الشراء (د.ت)'],
    'Tunis — port de Radès': ['Tunis — port of Radès', 'تونس — ميناء رادس'],
    'Pour recevoir votre estimation': ['To receive your estimate', 'لاستلام تقديرك'],
    'Nom complet': ['Full name', 'الاسم الكامل'],
    'Votre nom': ['Your name', 'اسمك'],
    'Adresse e-mail': ['Email address', 'البريد الإلكتروني'],
    'vous@exemple.com': ['you@example.com', 'you@example.com'],
    'Demander un devis personnalisé': ['Request a personalised quote', 'اطلب عرض سعر مخصّص'],
    "Prototype : aucune donnée n'est envoyée. L'importation dépend de votre éligibilité et de la réglementation tunisienne en vigueur, notamment du régime applicable à votre situation.": ['Prototype: no data is sent. Importing depends on your eligibility and on current Tunisian regulations, in particular the scheme that applies to your situation.', 'نموذج أولي: لا يتم إرسال أي بيانات. يتوقف الاستيراد على أهليتك وعلى التشريعات التونسية السارية، ولا سيما النظام المنطبق على وضعك.'],
    'Votre estimation': ['Your estimate', 'تقديرك'],
    'Indicative': ['Indicative', 'تقديري'],
    'Tunis · Radès': ['Tunis · Radès', 'تونس · رادس'],
    'Valeur du véhicule': ['Vehicle value', 'قيمة السيارة'],
    'Transport maritime estimé': ['Estimated sea freight', 'النقل البحري التقديري'],
    'Assurance transport estimée': ['Estimated shipping insurance', 'تأمين النقل التقديري'],
    'Accompagnement estimé': ['Estimated support fee', 'رسوم المرافقة التقديرية'],
    'Sous-total estimatif': ['Estimated subtotal', 'المجموع الفرعي التقديري'],
    'Hors droits de douane, taxes, frais portuaires et immatriculation. Les montants sont fictifs et illustrent le fonctionnement du simulateur, sans valeur de devis.': ['Excluding customs duties, taxes, port fees and registration. Amounts are fictitious and only illustrate how the simulator works; they are not a quote.', 'دون الرسوم الجمركية والضرائب ومصاريف الميناء والتسجيل. المبالغ وهمية وتوضّح طريقة عمل المحاكي فقط، ولا تمثّل عرض سعر.'],
    'Pas de surprise, un devis avant tout.': ['No surprises: a quote comes first.', 'لا مفاجآت: عرض السعر أولًا.'],
    "Les coûts réels et les conditions d'importation sont validés avant tout engagement.": ['Actual costs and import conditions are confirmed before any commitment.', 'تُعتمد التكاليف الفعلية وشروط الاستيراد قبل أي التزام.'],
    'Les bonnes questions, avant de partir.': ['The right questions, before you start.', 'الأسئلة المهمة، قبل الانطلاق.'],
    "Puis-je importer n'importe quel véhicule en Tunisie ?": ['Can I import any vehicle into Tunisia?', 'هل يمكنني استيراد أي سيارة إلى تونس؟'],
    "Non. L'éligibilité dépend notamment de votre statut, du régime d'importation, de l'âge et des caractéristiques du véhicule. Une vérification auprès des autorités compétentes est nécessaire avant l'achat.": ["No. Eligibility depends in particular on your status, the import scheme, and the vehicle's age and characteristics. A check with the competent authorities is required before purchase.", 'لا. تتوقف الأهلية خصوصًا على وضعك ونظام الاستيراد وعمر السيارة ومواصفاتها. يجب التحقق لدى السلطات المختصة قبل الشراء.'],
    "Que comprend l'estimation affichée ?": ['What does the displayed estimate include?', 'ماذا يشمل التقدير المعروض؟'],
    "Cette simulation fictive additionne le prix d'achat, le transport maritime, une assurance estimée et l'accompagnement. Elle n'inclut ni douane, ni taxes, ni frais portuaires ou d'immatriculation. Un devis réel doit détailler l'ensemble des postes applicables.": ['This fictitious simulation adds up the purchase price, sea freight, estimated insurance and support. It does not include customs, taxes, port or registration fees. A real quote must detail every applicable item.', 'تجمع هذه المحاكاة الوهمية سعر الشراء والنقل البحري وتأمينًا تقديريًا والمرافقة. ولا تشمل الجمارك ولا الضرائب ولا مصاريف الميناء أو التسجيل. يجب أن يفصّل عرض السعر الحقيقي جميع البنود المنطبقة.'],
    'Quels sont les délais de livraison ?': ['How long does delivery take?', 'ما هي آجال التوصيل؟'],
    "Ils dépendent de la provenance, des départs disponibles et du traitement administratif. Un calendrier prévisionnel est établi après étude du dossier, sans promesse de délai dans cette maquette.": ['It depends on the origin, available departures and administrative processing. A provisional schedule is drawn up after reviewing the file; this mock-up makes no promise on timing.', 'تتوقف على المصدر ومواعيد الشحن المتاحة والمعالجة الإدارية. يُعدّ جدول زمني تقديري بعد دراسة الملف، دون أي التزام بآجال في هذا النموذج.'],
    // Footer
    'France · Dubaï · Tunis': ['France · United Arab Emirates · Tunis', 'فرنسا · الإمارات العربية المتحدة · تونس'],
    'Neuf & occasion. Une nouvelle façon de prendre la route.': ['New & used. A new way to hit the road.', 'جديدة ومستعملة. طريقة جديدة للانطلاق على الطريق.'],
    'Concept de marque · 2026': ['Brand concept · 2026', 'مفهوم العلامة · 2026'],
    "MAQUETTE DE DÉMONSTRATION — Annonces et prix illustratifs. Photographies d'ambiance Unsplash, non contractuelles et non représentatives des configurations annoncées. Importation soumise à éligibilité et réglementation.": ['DEMO MOCK-UP — Listings and prices are illustrative. Unsplash mood photos, non-contractual and not representative of the listed configurations. Importing is subject to eligibility and regulations.', 'نموذج تجريبي — الإعلانات والأسعار توضيحية. صور Unsplash للإيحاء فقط، غير تعاقدية ولا تمثّل المواصفات المعلنة. يخضع الاستيراد للأهلية والتشريعات.'],
    // Messages
    'Véhicule ajouté à votre sélection pour cette session.': ['Vehicle added to your selection for this session.', 'أُضيفت السيارة إلى اختيارك لهذه الجلسة.'],
    'Véhicule retiré de votre sélection.': ['Vehicle removed from your selection.', 'أُزيلت السيارة من اختيارك.'],
    'Véhicule sélectionné. Fonction de sauvegarde en démonstration.': ['Vehicle selected. The save feature is a demo.', 'تم اختيار السيارة. ميزة الحفظ تجريبية.'],
    'Démonstration : votre estimation est prête. Aucune donnée n’a été envoyée.': ['Demo: your estimate is ready. No data was sent.', 'عرض تجريبي: تقديرك جاهز. لم يتم إرسال أي بيانات.'],
    // Contact buttons (Netlify demo)
    'Contactez-nous directement': ['Contact us directly', 'تواصل معنا مباشرة'],
    'Appeler': ['Call', 'اتصال'],
    'SMS': ['SMS', 'رسالة نصية'],
    'Une question ? Parlons-en.': ["Any questions? Let's talk.", 'لديك سؤال؟ لنتحدث.'],
    'Appelez-nous, écrivez-nous sur WhatsApp, par SMS ou par e-mail : un conseiller vous répond rapidement.': ['Call us or write to us on WhatsApp, by SMS or by email: an advisor will get back to you quickly.', 'اتصل بنا أو راسلنا عبر واتساب أو رسالة نصية أو البريد الإلكتروني: سيرد عليك مستشار بسرعة.'],
    // Deposit payment (server version)
    'Paiement annulé. Le véhicule n’a pas été réservé.': ['Payment cancelled. The vehicle has not been reserved.', 'تم إلغاء الدفع. لم يتم حجز السيارة.'],
    'Paiement confirmé : ce véhicule est réservé pour vous.': ['Payment confirmed: this vehicle is reserved for you.', 'تم تأكيد الدفع: هذه السيارة محجوزة لك.'],
    'Merci ! Votre acompte est confirmé, un conseiller vous contacte rapidement.': ['Thank you! Your deposit is confirmed, an advisor will contact you shortly.', 'شكرًا! تم تأكيد عربونك، وسيتصل بك مستشار قريبًا.'],
    'Paiement en cours de vérification. Un conseiller vous confirmera la réservation.': ['Payment being verified. An advisor will confirm your reservation.', 'الدفع قيد التحقق. سيؤكد لك مستشار الحجز.'],
    'Paiement indisponible pour le moment.': ['Payment is unavailable at the moment.', 'الدفع غير متاح حاليًا.'],
    'Connexion impossible. Réessayez.': ['Connection failed. Please try again.', 'تعذّر الاتصال. أعد المحاولة.'],
    'Nom et e-mail valides requis.': ['A valid name and email are required.', 'يلزم اسم وبريد إلكتروني صالحان.'],
    'Un paiement est déjà en cours pour ce véhicule. Réessayez dans quelques minutes.': ['A payment is already in progress for this vehicle. Please try again in a few minutes.', 'هناك عملية دفع جارية لهذه السيارة. أعد المحاولة بعد بضع دقائق.'],
    'Le service de paiement est indisponible. Réessayez plus tard.': ['The payment service is unavailable. Please try again later.', 'خدمة الدفع غير متاحة. أعد المحاولة لاحقًا.'],
    'Véhicule introuvable.': ['Vehicle not found.', 'السيارة غير موجودة.'],
    'Moyen de paiement inconnu.': ['Unknown payment method.', 'وسيلة دفع غير معروفة.'],
    'Stripe n’est pas configuré.': ['Stripe is not configured.', 'Stripe غير مُفعّل.'],
    'Mamo Pay n’est pas configuré.': ['Mamo Pay is not configured.', 'Mamo Pay غير مُفعّل.']
  };

  const NUM = '([\\d\\s.,]+)';
  const isolateNumber = value => `\u2066${value}\u2069`;
  const plural = (n, en, ar) => [n === 1 ? `1 ${en[0]}` : `${n} ${en[1]}`, n === 1 ? ar[0] : n === 2 ? ar[1] : n >= 3 && n <= 10 ? `${n} ${ar[2]}` : `${n} ${ar[3]}`];
  const POST_TYPES = { 'Post': ['Post', 'منشور'], 'Reel': ['Reel', 'ريلز'], 'Vidéo': ['Video', 'فيديو'], 'Page et publications': ['Page & posts', 'الصفحة والمنشورات'] };
  // [French regex, (match, langIndex, word) => translation]; word() translates a French word via DICT.
  const PATTERNS = [
    // Brand-agnostic (ALLANI Auto on the server version, Prime Cars on the Netlify demo)
    [/^(.+) — Votre prochaine destination$/, (m, i) => [`${m[1]} — Your next destination`, `${m[1]} — وجهتك القادمة`][i]],
    [/^(.+), accueil$/, (m, i) => [`${m[1]}, home`, `${m[1]}، الصفحة الرئيسية`][i]],
    [/^LA SÉLECTION (.+)$/, (m, i) => [`THE ${m[1]} SELECTION`, `تشكيلة ${m[1]}`][i]],
    [/^LIVE (.+)$/i, (m, i) => [`${m[1]} LIVE`, `بث ${m[1]} المباشر`][i]],
    [new RegExp(`^${NUM} km$`), (m, i) => [`${m[1]} km`, `${isolateNumber(m[1])} كم`][i]],
    [new RegExp(`^${NUM} TND$`), (m, i) => [`${m[1]} TND`, `${isolateNumber(m[1])} د.ت`][i]],
    [/^(\d+) ch$/, (m, i) => [`${m[1]} hp`, `${isolateNumber(m[1])} حصان`][i]],
    [/^(\d+) véhicules?$/, (m, i) => plural(Number(m[1]), ['vehicle', 'vehicles'], ['سيارة واحدة', 'سيارتان', 'سيارات', 'سيارة'])[i]],
    [new RegExp(`^À partir de ${NUM} TND$`), (m, i) => [`From ${m[1]} TND`, `ابتداءً من ${isolateNumber(m[1])} د.ت`][i]],
    [new RegExp(`^${NUM} TND · (\\d{4})$`), (m, i) => [`${m[1]} TND · ${m[2]}`, `${isolateNumber(m[1])} د.ت · ${isolateNumber(m[2])}`][i]],
    [new RegExp(`^(.*) · (\\d{4}) · ${NUM} km · (.+)$`), (m, i, word) => [`${m[1]} · ${m[2]} · ${m[3]} km · ${word(m[4])}`, `${m[1]} · ${isolateNumber(m[2])} · ${isolateNumber(m[3])} كم · ${word(m[4])}`][i]],
    [/^APERÇU DÉMO · (Instagram|Facebook) · (.+)$/, (m, i) => [`DEMO PREVIEW · ${m[1]} · ${m[2]}`, `معاينة تجريبية · ${m[1]} · ${m[2]}`][i]],
    [/^(Démo · )?(Instagram|Facebook|TikTok) · (Post|Reel|Vidéo|Page et publications)$/, (m, i) => `${m[1] ? ['Demo · ', 'تجريبي · '][i] : ''}${m[2]} · ${POST_TYPES[m[3]][i]}`],
    [/^(.+)\. Votre prochain départ commence ici\. Contactez-nous pour en savoir plus\.$/, (m, i) => [`${m[1]}. Your next ride starts here. Contact us to find out more.`, `${m[1]}. انطلاقتك القادمة تبدأ من هنا. تواصل معنا لمعرفة المزيد.`][i]],
    [/^Voir (.+)$/, (m, i) => [`View ${m[1]}`, `عرض ${m[1]}`][i]],
    [/^Sauvegarder (.+)$/, (m, i) => [`Save ${m[1]}`, `حفظ ${m[1]}`][i]],
    [/^Découvrir (.+)$/, (m, i) => [`Discover ${m[1]}`, `اكتشف ${m[1]}`][i]],
    [/^Photographie d’ambiance (.+)$/, (m, i) => [`${m[1]} mood photo`, `صورة توضيحية لـ ${m[1]}`][i]],
    [/^Photographie (.+)$/, (m, i) => [`${m[1]} photo`, `صورة ${m[1]}`][i]],
    [/^Publication (instagram|facebook|tiktok)$/i, (m, i) => [`${m[1]} post`, `منشور ${m[1]}`][i]],
    [/^Photo (\d+)$/, (m, i) => [`Photo ${m[1]}`, `صورة ${m[1]}`][i]],
    [/^(.+), photo (\d+)$/, (m, i) => [`${m[1]}, photo ${m[2]}`, `${m[1]}، صورة ${m[2]}`][i]],
    [/^Page (\d+)$/, (m, i) => [`Page ${m[1]}`, `صفحة ${m[1]}`][i]]
  ];

  const norm = value => value.replace(/\s+/g, ' ').trim();
  const dict = new Map(Object.entries(DICT).map(([fr, translations]) => [norm(fr), translations]));
  const params = new URLSearchParams(location.search);
  let stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch {}
  let lang = [params.get('lang'), stored].find(value => LANGS.includes(value)) || 'fr';

  function translate(french) {
    const key = norm(french);
    if (lang === 'fr') {
      if (key === 'France') return 'France';
      if (key === 'Dubaï') return 'Émirats arabes unis';
      if (key === 'Dubaï / France') return 'Émirats arabes unis / France';
      if (key === 'France · Dubaï · Tunis') return 'France · Émirats arabes unis · Tunis';
      return french.replaceAll('De Dubaï', 'Des Émirats arabes unis').replaceAll('de Dubaï', 'des Émirats arabes unis').replaceAll('à Dubaï', 'aux Émirats arabes unis').replaceAll('Dubaï', 'Émirats arabes unis');
    }
    const index = LANGS.indexOf(lang) - 1;
    const word = value => dict.get(norm(value))?.[index] ?? value;
    if (!key || !/\p{L}/u.test(key)) return french;
    const localizeCountryNames = value => value.replaceAll('from Dubai', 'from the United Arab Emirates').replaceAll('in Dubai', 'in the United Arab Emirates').replaceAll('Dubai', 'the United Arab Emirates').replaceAll('دبي', 'الإمارات العربية المتحدة');
    if (dict.has(key)) return localizeCountryNames(dict.get(key)[index]);
    for (const [regex, build] of PATTERNS) {
      const match = key.match(regex);
      if (match) return localizeCountryNames(build(match, index, word));
    }
    return localizeCountryNames(french);
  }
  const keepSpacing = (original, translated) => original.match(/^\s*/)[0] + translated + original.match(/\s*$/)[0];
  const skip = element => !element || element.closest('script,style,[data-no-i18n]');

  // Remembers the French original of each text node / attribute, so switching back and forth is lossless
  // and text later rewritten by the page's own scripts is picked up as the new original.
  const textState = new WeakMap();
  const attrState = new WeakMap();
  function translateText(node) {
    if (skip(node.parentElement)) return;
    if (node.parentElement?.tagName === 'OPTION' && !node.parentElement.hasAttribute('value')) {
      node.parentElement.setAttribute('value', node.parentElement.textContent.trim());
    }
    let state = textState.get(node);
    if (!state || node.nodeValue !== state.applied) { state = { original: node.nodeValue }; textState.set(node, state); }
    const translated = translate(state.original);
    state.applied = translated === state.original ? state.original : keepSpacing(state.original, translated);
    if (node.nodeValue !== state.applied) node.nodeValue = state.applied;
  }
  function translateAttribute(element, name) {
    if (skip(element) || !element.hasAttribute(name)) return;
    const states = attrState.get(element) || {};
    attrState.set(element, states);
    const value = element.getAttribute(name);
    if (!states[name] || value !== states[name].applied) states[name] = { original: value };
    states[name].applied = translate(states[name].original);
    if (value !== states[name].applied) element.setAttribute(name, states[name].applied);
  }
  function translateTree(root) {
    if (root.nodeType === Node.TEXT_NODE) return translateText(root);
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) translateText(node);
    for (const element of [root, ...root.querySelectorAll(ATTRS.map(name => `[${name}]`).join(','))]) {
      for (const name of ATTRS) translateAttribute(element, name);
    }
  }

  // The page sets window.siteCurrentCar (and calls window.renderCarDescription) once the vehicle is known.
  function renderDescription() {
    const box = document.getElementById('car-description');
    if (!box) return;
    const description = window.siteCurrentCar?.description;
    const text = typeof description === 'string' ? description : description?.[lang] || description?.fr || '';
    box.hidden = !text;
    document.getElementById('detail-description').textContent = text;
  }
  window.renderCarDescription = renderDescription;

  function applyDocumentLanguage() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (lang === 'ar' && !document.getElementById('font-ar')) {
      const font = document.createElement('link');
      font.id = 'font-ar';
      font.rel = 'stylesheet';
      font.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap';
      document.head.append(font);
    }
  }

  function setLanguage(next) {
    if (!LANGS.includes(next)) return;
    lang = next;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    if (params.has('lang')) { params.set('lang', lang); history.replaceState(history.state, '', `?${params}${location.hash}`); }
    applyDocumentLanguage();
    translateTree(document.documentElement);
    renderDescription();
    document.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === lang)));
  }

  const style = document.createElement('style');
  style.textContent = `
    .lang-switch{display:flex;gap:2px;align-items:center}
    .lang-switch button{border:0;background:transparent;color:inherit;opacity:.65;font:inherit;font-weight:600;padding:2px 7px;border-radius:3px;cursor:pointer}
    .lang-switch button[aria-pressed="true"]{opacity:1;background:#ffffff1f;color:var(--lime)}
    .lang-switch button:hover{opacity:1}
    .car-description{padding:26px 0 8px}
    .car-description h2{font-size:22px;margin-bottom:12px}
    .car-description p{font-size:14px;line-height:1.9;color:#3e4b44;max-width:780px}
    @media(max-width:720px){.topline .wrap{justify-content:space-between}.topline .wrap>span:nth-child(2){display:none}.topline .wrap>span.lang-switch{display:flex}}
    html[lang="ar"] *{letter-spacing:0!important}
    html[lang="ar"] body,html[lang="ar"] h1,html[lang="ar"] h2,html[lang="ar"] h3,html[lang="ar"] button,html[lang="ar"] input,html[lang="ar"] select{font-family:'Cairo','DM Sans',sans-serif}
    html[lang="ar"] .brand{font-family:'Manrope',sans-serif}
    html[dir="rtl"] .lucide-arrow-right,html[dir="rtl"] .lucide-arrow-up-right,html[dir="rtl"] .lucide-chevron-right{transform:scaleX(-1)}
    html[dir="rtl"] .hero>img{transform:scaleX(-1)}
    html[dir="rtl"] .hero:after{background:linear-gradient(270deg,rgba(8,21,16,.91),rgba(8,21,16,.6) 40%,rgba(8,21,16,.02) 75%)}
    html[dir="rtl"] .hero-caption{right:auto;left:48px;border-left:0;border-right:1px solid #ffffff70;padding-left:0;padding-right:17px}
    html[dir="rtl"] .field:not(:first-child){border-left:0;padding-left:0;border-right:1px solid var(--line);padding-right:20px}
    html[dir="rtl"] .car-picture>.tag{left:auto;right:14px}
    html[dir="rtl"] .favorite{right:auto;left:12px}
  `;
  document.head.append(style);
  applyDocumentLanguage();

  document.addEventListener('DOMContentLoaded', () => {
    setLanguage(lang);
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-lang]');
      if (button) setLanguage(button.dataset.lang);
    });
    new MutationObserver(mutations => {
      if (lang === 'fr') return;
      for (const mutation of mutations) {
        if (mutation.type === 'childList') mutation.addedNodes.forEach(translateTree);
        else if (mutation.type === 'characterData') translateText(mutation.target);
        else translateAttribute(mutation.target, mutation.attributeName);
      }
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  });
})();
