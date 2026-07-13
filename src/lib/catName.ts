import i18n from "@/i18n";

export interface LocalizedCategory {
  name: string;
  name_ru?: string | null;
  name_en?: string | null;
  slug?: string | null;
}

const FALLBACK_CATEGORY_NAMES: Record<string, { ru: string; en: string }> = {
  "geyim": { ru: "Одежда и мода", en: "Clothing & Fashion" },
  "ayaqqabi": { ru: "Обувь", en: "Shoes" },
  "canta-aksesuar": { ru: "Сумки и аксессуары", en: "Bags & Accessories" },
  "elektronika": { ru: "Электроника", en: "Electronics" },
  "ev-dekor": { ru: "Дом и декор", en: "Home & Decor" },
  "ev-aletleri": { ru: "Бытовая техника", en: "Home Appliances" },
  "gozellik": { ru: "Красота и уход", en: "Beauty & Personal Care" },
  "idman-hobi": { ru: "Спорт и хобби", en: "Sports & Hobby" },
  "usaq-korpe": { ru: "Детские товары", en: "Kids & Baby" },
  "pet-shop": { ru: "Зоотовары", en: "Pet Shop" },
  "supermarket": { ru: "Супермаркет", en: "Supermarket" },
  "saglamliq": { ru: "Здоровье и медицина", en: "Health & Medical" },
  "kitab-ofis": { ru: "Книги и офис", en: "Books & Office" },
  "avto-moto": { ru: "Авто и мото", en: "Auto & Moto" },
  "bagcilik": { ru: "Сад и огород", en: "Garden" },
  "geyim-qadin": { ru: "Женская одежда", en: "Women's clothing" },
  "geyim-kisi": { ru: "Мужская одежда", en: "Men's clothing" },
  "geyim-usaq": { ru: "Детская одежда", en: "Kids clothing" },
  "ayaqqabi-qadin": { ru: "Женская обувь", en: "Women's shoes" },
  "ayaqqabi-kisi": { ru: "Мужская обувь", en: "Men's shoes" },
  "ayaqqabi-usaq": { ru: "Детская обувь", en: "Kids shoes" },
  "aks-canta": { ru: "Сумки", en: "Bags" },
  "aks-cuzdan": { ru: "Кошельки и ремни", en: "Wallets & Belts" },
  "aks-saat": { ru: "Часы", en: "Watches" },
  "aks-eynek": { ru: "Очки", en: "Glasses" },
  "aks-zergerlik": { ru: "Украшения", en: "Jewelry" },
  "aks-papaq": { ru: "Шапки и шарфы", en: "Hats & Scarves" },
  "el-telefon": { ru: "Телефоны", en: "Phones" },
  "el-kompyuter": { ru: "Ноутбуки и ПК", en: "Laptops & PCs" },
  "el-tablet": { ru: "Планшеты", en: "Tablets" },
  "el-tv": { ru: "Телевизоры", en: "TVs" },
  "el-audio": { ru: "Наушники и аудио", en: "Headphones & Audio" },
  "el-foto": { ru: "Фото и видео", en: "Photo & Video" },
  "el-gaming": { ru: "Игры", en: "Gaming" },
  "el-smartwatch": { ru: "Умные часы", en: "Smartwatches" },
  "el-aksesuar": { ru: "Аксессуары", en: "Accessories" },
  "evd-mebel": { ru: "Мебель", en: "Furniture" },
  "evd-yataq": { ru: "Постельное белье", en: "Bedding" },
  "evd-xalca": { ru: "Ковры", en: "Carpets" },
  "evd-perde": { ru: "Шторы", en: "Curtains" },
  "evd-isiq": { ru: "Освещение", en: "Lighting" },
  "evd-metbex": { ru: "Кухонные принадлежности", en: "Kitchenware" },
  "evd-dekor": { ru: "Декор", en: "Decor" },
  "evd-saxlama": { ru: "Хранение", en: "Storage" },
  "mt-soyuducu": { ru: "Холодильники", en: "Refrigerators" },
  "mt-paltaryuyan": { ru: "Стиральные машины", en: "Washing machines" },
  "mt-qabyuyan": { ru: "Посудомоечные", en: "Dishwashers" },
  "mt-soba": { ru: "Плиты и духовки", en: "Stoves & Ovens" },
  "mt-kondisioner": { ru: "Кондиционеры", en: "Air conditioners" },
  "mt-kicik": { ru: "Мелкая бытовая техника", en: "Small appliances" },
  "mt-tozsoran": { ru: "Пылесосы", en: "Vacuum cleaners" },
  "gz-makiyaj": { ru: "Макияж", en: "Makeup" },
  "gz-deri": { ru: "Уход за кожей", en: "Skincare" },
  "gz-sac": { ru: "Уход за волосами", en: "Haircare" },
  "gz-etir": { ru: "Парфюмерия", en: "Perfume" },
  "gz-sexsi": { ru: "Личная гигиена", en: "Personal care" },
  "gz-manikur": { ru: "Маникюр и педикюр", en: "Manicure & Pedicure" },
  "ih-avadanliq": { ru: "Спортинвентарь", en: "Sports equipment" },
  "ih-geyim": { ru: "Спортивная одежда", en: "Sportswear" },
  "ih-kamp": { ru: "Туризм и кемпинг", en: "Outdoor & Camping" },
  "ih-velosiped": { ru: "Велосипеды и самокаты", en: "Bikes & Scooters" },
  "ih-hobi": { ru: "Хобби и коллекции", en: "Hobby & Collections" },
  "ih-musiqi": { ru: "Музыкальные инструменты", en: "Musical instruments" },
  "ih-baliqciliq": { ru: "Рыбалка", en: "Fishing" },
  "uk-qida": { ru: "Детское питание", en: "Baby food" },
  "uk-bez": { ru: "Подгузники и гигиена", en: "Diapers & Hygiene" },
  "uk-araba": { ru: "Коляски", en: "Strollers" },
  "uk-avto": { ru: "Автокресла", en: "Car seats" },
  "uk-oyuncaq": { ru: "Игрушки", en: "Toys" },
  "uk-otaq": { ru: "Детская комната", en: "Kids room" },
  "pet-it": { ru: "Товары для собак", en: "Dog products" },
  "pet-pisik": { ru: "Товары для кошек", en: "Cat products" },
  "pet-qus": { ru: "Товары для птиц", en: "Bird products" },
  "pet-balıq": { ru: "Аквариумы и рыбы", en: "Aquarium & fish" },
  "pet-kemirici": { ru: "Грызуны", en: "Rodents" },
  "sm-quru": { ru: "Бакалея", en: "Pantry" },
  "sm-icki": { ru: "Напитки", en: "Drinks" },
  "sm-sirni": { ru: "Сладости", en: "Sweets" },
  "sm-cay": { ru: "Чай и кофе", en: "Tea & Coffee" },
  "sm-sud": { ru: "Молочные", en: "Dairy" },
  "sm-temizlik": { ru: "Бытовая химия", en: "Cleaning" },
  "sg-vitamin": { ru: "Витамины и БАДы", en: "Vitamins & supplements" },
  "sg-cihaz": { ru: "Медтехника", en: "Medical devices" },
  "sg-apteka": { ru: "Аптечные товары", en: "Pharmacy" },
  "sg-optika": { ru: "Оптика", en: "Optics" },
  "ko-kitab": { ru: "Книги", en: "Books" },
  "ko-defter": { ru: "Канцтовары", en: "Stationery" },
  "ko-cap": { ru: "Печатная техника", en: "Printing equipment" },
  "ko-mebel": { ru: "Офисная мебель", en: "Office furniture" },
  "am-aksesuar": { ru: "Аксессуары", en: "Accessories" },
  "am-yag": { ru: "Масла и химия", en: "Oils & Chemicals" },
  "am-ehtiyat": { ru: "Запчасти", en: "Spare parts" },
  "am-elektronika": { ru: "Автоэлектроника", en: "Auto electronics" },
  "am-moto": { ru: "Мотоэкипировка", en: "Moto gear" },
  "bg-toxum": { ru: "Семена и растения", en: "Seeds & Plants" },
  "bg-aletler": { ru: "Садовые инструменты", en: "Garden tools" },
  "bg-gubre": { ru: "Удобрения и почва", en: "Fertilizer & Soil" },
  "bg-sulama": { ru: "Полив", en: "Watering" },
  "bg-mebel": { ru: "Садовая мебель", en: "Garden furniture" },
  "gq-paltar": { ru: "Платья", en: "Dresses" },
  "gq-bluz": { ru: "Блузки и рубашки", en: "Blouses & Shirts" },
  "gq-tisort": { ru: "Футболки", en: "T-shirts" },
  "gq-salvar": { ru: "Брюки и джинсы", en: "Pants & Jeans" },
  "gq-yubka": { ru: "Юбки", en: "Skirts" },
  "gq-sviter": { ru: "Свитера и кардиганы", en: "Sweaters & Cardigans" },
  "gq-pencek": { ru: "Пиджаки и блейзеры", en: "Jackets & Blazers" },
  "gq-palto": { ru: "Пальто и куртки", en: "Coats & Jackets" },
  "gq-don": { ru: "Платья и комбинезоны", en: "Dresses & Jumpsuits" },
  "gq-ic": { ru: "Нижнее белье", en: "Lingerie" },
  "gq-pijama": { ru: "Пижамы и сорочки", en: "Pajamas & Nightwear" },
  "gq-spor": { ru: "Спортивная одежда", en: "Sportswear" },
  "gq-uzgucu": { ru: "Купальники", en: "Swimwear" },
  "gk-tisort": { ru: "Футболки", en: "T-shirts" },
  "gk-koynek": { ru: "Рубашки", en: "Shirts" },
  "gk-salvar": { ru: "Брюки и джинсы", en: "Pants & Jeans" },
  "gk-sviter": { ru: "Свитера и кардиганы", en: "Sweaters" },
  "gk-kostyum": { ru: "Пиджаки и костюмы", en: "Suits & Blazers" },
  "gk-palto": { ru: "Пальто и куртки", en: "Coats & Jackets" },
  "gk-ic": { ru: "Нижнее белье", en: "Underwear" },
  "gk-pijama": { ru: "Пижамы", en: "Pajamas" },
  "gk-spor": { ru: "Спортивная одежда", en: "Sportswear" },
  "gu-korpe": { ru: "Малыши (0-2)", en: "Baby (0-2)" },
  "gu-qiz": { ru: "Для девочек", en: "Girls" },
  "gu-oglan": { ru: "Для мальчиков", en: "Boys" },
  "gu-mekteb": { ru: "Школьная форма", en: "School uniform" },
  "gu-pijama": { ru: "Пижамы", en: "Pajamas" },
  "gu-spor": { ru: "Спортивная одежда", en: "Sportswear" },
  "tel-apple": { ru: "Apple iPhone", en: "Apple iPhone" },
  "tel-samsung": { ru: "Samsung", en: "Samsung" },
  "tel-xiaomi": { ru: "Xiaomi", en: "Xiaomi" },
  "tel-huawei": { ru: "Huawei", en: "Huawei" },
  "tel-oppo": { ru: "Oppo", en: "Oppo" },
  "tel-oneplus": { ru: "OnePlus", en: "OnePlus" },
  "tel-vivo": { ru: "Vivo", en: "Vivo" },
  "tel-realme": { ru: "Realme", en: "Realme" },
  "tel-honor": { ru: "Honor", en: "Honor" },
  "tel-motorola": { ru: "Motorola", en: "Motorola" },
  "tel-nokia": { ru: "Nokia", en: "Nokia" },
  "tel-sony": { ru: "Sony", en: "Sony" },
  "tel-tuslu": { ru: "Кнопочные", en: "Feature phones" },
  "tel-qatlanan": { ru: "Складные", en: "Foldable" },
  "tel-refurb": { ru: "Восстановленные", en: "Refurbished" },
  "aq-daban": { ru: "На каблуке", en: "Heels" },
  "aq-duz": { ru: "Без каблука", en: "Flats" },
  "aq-sneaker": { ru: "Кроссовки", en: "Sneakers" },
  "aq-cekme": { ru: "Ботинки и сапоги", en: "Boots" },
  "aq-sandal": { ru: "Сандалии", en: "Sandals" },
  "aq-terlik": { ru: "Тапочки", en: "Slippers" },
  "aq-balerin": { ru: "Балетки", en: "Ballerinas" },
  "ak-klassik": { ru: "Классические", en: "Classic" },
  "ak-sneaker": { ru: "Кроссовки", en: "Sneakers" },
  "ak-cekme": { ru: "Ботинки", en: "Boots" },
  "ak-sandal": { ru: "Сандалии", en: "Sandals" },
  "ak-terlik": { ru: "Тапочки", en: "Slippers" },
  "ak-is": { ru: "Рабочая обувь", en: "Work shoes" },
  "au-korpe": { ru: "Для малышей", en: "Baby shoes" },
  "au-sneaker": { ru: "Кроссовки", en: "Sneakers" },
  "au-sandal": { ru: "Сандалии", en: "Sandals" },
  "au-cekme": { ru: "Ботинки", en: "Boots" },
  "au-mekteb": { ru: "Школьная обувь", en: "School shoes" },
};


const WILDBERRIES_CATEGORY_NAMES: Record<string, { ru: string; en: string }> = {
  "elektronika": {
    "ru": "Электроника",
    "en": "Electronics"
  },
  "elektronika-smartfonlar": {
    "ru": "Смартфоны",
    "en": "Smartphones"
  },
  "elektronika-telefon-aksesuarlari": {
    "ru": "Аксессуары для телефонов",
    "en": "Phone accessories"
  },
  "elektronika-noutbuklar": {
    "ru": "Ноутбуки",
    "en": "Laptops"
  },
  "elektronika-plansetler": {
    "ru": "Планшеты",
    "en": "Tablets"
  },
  "elektronika-stolustu-komputerler": {
    "ru": "Настольные компьютеры",
    "en": "Desktop computers"
  },
  "elektronika-monitorlar": {
    "ru": "Мониторы",
    "en": "Monitors"
  },
  "elektronika-klaviatura-ve-mauslar": {
    "ru": "Клавиатуры и мыши",
    "en": "Keyboards & mice"
  },
  "elektronika-yaddas-ve-diskler": {
    "ru": "Память и диски",
    "en": "Memory & drives"
  },
  "elektronika-printerler-ve-skanerler": {
    "ru": "Принтеры и сканеры",
    "en": "Printers & scanners"
  },
  "elektronika-sebeke-avadanligi": {
    "ru": "Сетевое оборудование",
    "en": "Network equipment"
  },
  "elektronika-televizorlar": {
    "ru": "Телевизоры",
    "en": "TVs"
  },
  "elektronika-audio-sistemler": {
    "ru": "Аудиосистемы",
    "en": "Audio systems"
  },
  "elektronika-qulaqliqlar": {
    "ru": "Наушники",
    "en": "Headphones"
  },
  "elektronika-kamera-ve-fotoaparatlar": {
    "ru": "Камеры и фотоаппараты",
    "en": "Cameras & photo"
  },
  "elektronika-smart-saatlar": {
    "ru": "Умные часы",
    "en": "Smart watches"
  },
  "elektronika-oyun-konsollari": {
    "ru": "Игровые консоли",
    "en": "Game consoles"
  },
  "elektronika-powerbanklar": {
    "ru": "Повербанки",
    "en": "Power banks"
  },
  "elektronika-kabeller-ve-adapterler": {
    "ru": "Кабели и адаптеры",
    "en": "Cables & adapters"
  },
  "qadin-geyimleri": {
    "ru": "Женская одежда",
    "en": "Women's clothing"
  },
  "qadin-geyimleri-donlar": {
    "ru": "Платья",
    "en": "Dresses"
  },
  "qadin-geyimleri-bluzlar-ve-koynekler": {
    "ru": "Блузки и рубашки",
    "en": "Blouses & shirts"
  },
  "qadin-geyimleri-yubkalar": {
    "ru": "Юбки",
    "en": "Skirts"
  },
  "qadin-geyimleri-salvarlar": {
    "ru": "Брюки",
    "en": "Pants"
  },
  "qadin-geyimleri-cinsler": {
    "ru": "Джинсы",
    "en": "Jeans"
  },
  "qadin-geyimleri-pencekler": {
    "ru": "Жакеты",
    "en": "Blazers"
  },
  "qadin-geyimleri-paltolar-ve-kurkler": {
    "ru": "Пальто и шубы",
    "en": "Coats & fur coats"
  },
  "qadin-geyimleri-trikotaj": {
    "ru": "Трикотаж",
    "en": "Knitwear"
  },
  "qadin-geyimleri-alt-paltarlari": {
    "ru": "Нижнее бельё",
    "en": "Underwear"
  },
  "qadin-geyimleri-pijamalar": {
    "ru": "Пижамы",
    "en": "Pajamas"
  },
  "qadin-geyimleri-idman-geyimleri": {
    "ru": "Спортивная одежда",
    "en": "Sportswear"
  },
  "qadin-geyimleri-cimerlik-geyimleri": {
    "ru": "Пляжная одежда",
    "en": "Swimwear"
  },
  "qadin-geyimleri-hicab-geyimleri": {
    "ru": "Одежда для хиджаба",
    "en": "Hijab clothing"
  },
  "qadin-geyimleri-hamile-geyimleri": {
    "ru": "Одежда для беременных",
    "en": "Maternity clothing"
  },
  "kisi-geyimleri": {
    "ru": "Мужская одежда",
    "en": "Men's clothing"
  },
  "kisi-geyimleri-koynekler": {
    "ru": "Рубашки",
    "en": "Shirts"
  },
  "kisi-geyimleri-futbolkalar": {
    "ru": "Футболки",
    "en": "T-shirts"
  },
  "kisi-geyimleri-salvarlar": {
    "ru": "Брюки",
    "en": "Pants"
  },
  "kisi-geyimleri-cinsler": {
    "ru": "Джинсы",
    "en": "Jeans"
  },
  "kisi-geyimleri-sortlar": {
    "ru": "Шорты",
    "en": "Shorts"
  },
  "kisi-geyimleri-kostyumlar": {
    "ru": "Костюмы",
    "en": "Suits"
  },
  "kisi-geyimleri-pencekler": {
    "ru": "Пиджаки",
    "en": "Blazers"
  },
  "kisi-geyimleri-paltolar-ve-godekceler": {
    "ru": "Пальто и куртки",
    "en": "Coats & jackets"
  },
  "kisi-geyimleri-trikotaj": {
    "ru": "Трикотаж",
    "en": "Knitwear"
  },
  "kisi-geyimleri-alt-paltarlari": {
    "ru": "Нижнее бельё",
    "en": "Underwear"
  },
  "kisi-geyimleri-idman-geyimleri": {
    "ru": "Спортивная одежда",
    "en": "Sportswear"
  },
  "kisi-geyimleri-cimerlik-geyimleri": {
    "ru": "Пляжная одежда",
    "en": "Swimwear"
  },
  "kisi-geyimleri-is-geyimleri": {
    "ru": "Рабочая одежда",
    "en": "Workwear"
  },
  "usaq-ve-korpe": {
    "ru": "Детские товары",
    "en": "Kids & baby"
  },
  "usaq-ve-korpe-korpe-geyimleri": {
    "ru": "Одежда для малышей",
    "en": "Baby clothing"
  },
  "usaq-ve-korpe-usaq-geyimleri": {
    "ru": "Детская одежда",
    "en": "Kids clothing"
  },
  "usaq-ve-korpe-usaq-ayaqqabilari": {
    "ru": "Детская обувь",
    "en": "Kids shoes"
  },
  "usaq-ve-korpe-oyuncaqlar": {
    "ru": "Игрушки",
    "en": "Toys"
  },
  "usaq-ve-korpe-konstruktorlar": {
    "ru": "Конструкторы",
    "en": "Building sets"
  },
  "usaq-ve-korpe-korpe-arabalari": {
    "ru": "Коляски",
    "en": "Strollers"
  },
  "usaq-ve-korpe-avtokreslolari": {
    "ru": "Автокресла",
    "en": "Car seats"
  },
  "usaq-ve-korpe-usaq-qidalari": {
    "ru": "Детское питание",
    "en": "Baby food"
  },
  "usaq-ve-korpe-pampers-ve-gigiyena": {
    "ru": "Подгузники и гигиена",
    "en": "Diapers & hygiene"
  },
  "usaq-ve-korpe-mektebli-levazimatlari": {
    "ru": "Школьные принадлежности",
    "en": "School supplies"
  },
  "usaq-ve-korpe-usaq-mebeli": {
    "ru": "Детская мебель",
    "en": "Kids furniture"
  },
  "usaq-ve-korpe-velosiped-ve-samokat": {
    "ru": "Велосипеды и самокаты",
    "en": "Bikes & scooters"
  },
  "ayaqqabi": {
    "ru": "Обувь",
    "en": "Shoes"
  },
  "ayaqqabi-qadin-ayaqqabilari": {
    "ru": "Женская обувь",
    "en": "Women's shoes"
  },
  "ayaqqabi-kisi-ayaqqabilari": {
    "ru": "Мужская обувь",
    "en": "Men's shoes"
  },
  "ayaqqabi-usaq-ayaqqabilari": {
    "ru": "Детская обувь",
    "en": "Kids shoes"
  },
  "ayaqqabi-idman-ayaqqabilari": {
    "ru": "Спортивная обувь",
    "en": "Sports shoes"
  },
  "ayaqqabi-krossovkalar": {
    "ru": "Кроссовки",
    "en": "Sneakers"
  },
  "ayaqqabi-cekmeler": {
    "ru": "Сапоги и ботинки",
    "en": "Boots"
  },
  "ayaqqabi-sandallar": {
    "ru": "Сандалии",
    "en": "Sandals"
  },
  "ayaqqabi-klassik-ayaqqabilar": {
    "ru": "Классическая обувь",
    "en": "Classic shoes"
  },
  "ayaqqabi-ev-ayaqqabilari": {
    "ru": "Домашняя обувь",
    "en": "Home shoes"
  },
  "ayaqqabi-rezin-cekmeler": {
    "ru": "Резиновые сапоги",
    "en": "Rubber boots"
  },
  "gozellik-ve-baxim": {
    "ru": "Красота и уход",
    "en": "Beauty & care"
  },
  "gozellik-ve-baxim-dekorativ-kosmetika": {
    "ru": "Декоративная косметика",
    "en": "Makeup"
  },
  "gozellik-ve-baxim-uz-baximi": {
    "ru": "Уход за лицом",
    "en": "Face care"
  },
  "gozellik-ve-baxim-sac-baximi": {
    "ru": "Уход за волосами",
    "en": "Hair care"
  },
  "gozellik-ve-baxim-beden-baximi": {
    "ru": "Уход за телом",
    "en": "Body care"
  },
  "gozellik-ve-baxim-etirler": {
    "ru": "Парфюмерия",
    "en": "Perfumes"
  },
  "gozellik-ve-baxim-manikur-ve-pedikur": {
    "ru": "Маникюр и педикюр",
    "en": "Manicure & pedicure"
  },
  "gozellik-ve-baxim-kisi-baximi": {
    "ru": "Мужской уход",
    "en": "Men's care"
  },
  "gozellik-ve-baxim-sac-qurutma-ve-duzeltme": {
    "ru": "Сушка и укладка волос",
    "en": "Hair dryers & styling"
  },
  "gozellik-ve-baxim-epilyasiya-cihazlari": {
    "ru": "Эпиляторы",
    "en": "Hair removal devices"
  },
  "gozellik-ve-baxim-agiz-gigiyenasi": {
    "ru": "Гигиена полости рта",
    "en": "Oral hygiene"
  },
  "gozellik-ve-baxim-professional-vasiteler": {
    "ru": "Профессиональные средства",
    "en": "Professional products"
  },
  "ev-ve-metbex": {
    "ru": "Дом и кухня",
    "en": "Home & kitchen"
  },
  "ev-ve-metbex-qab-qacaq": {
    "ru": "Посуда",
    "en": "Tableware"
  },
  "ev-ve-metbex-cengel-bicaq-destleri": {
    "ru": "Столовые приборы",
    "en": "Cutlery sets"
  },
  "ev-ve-metbex-tavalar-ve-qazanlar": {
    "ru": "Сковороды и кастрюли",
    "en": "Pans & pots"
  },
  "ev-ve-metbex-bicaqlar": {
    "ru": "Ножи",
    "en": "Knives"
  },
  "ev-ve-metbex-kicik-meiset-texnikasi": {
    "ru": "Мелкая бытовая техника",
    "en": "Small appliances"
  },
  "ev-ve-metbex-boyuk-meiset-texnikasi": {
    "ru": "Крупная бытовая техника",
    "en": "Large appliances"
  },
  "ev-ve-metbex-tozsoranlar": {
    "ru": "Пылесосы",
    "en": "Vacuum cleaners"
  },
  "ev-ve-metbex-utuler": {
    "ru": "Утюги",
    "en": "Irons"
  },
  "ev-ve-metbex-metbex-aksesuarlari": {
    "ru": "Кухонные аксессуары",
    "en": "Kitchen accessories"
  },
  "ev-ve-metbex-saxlama-qablari": {
    "ru": "Контейнеры для хранения",
    "en": "Storage containers"
  },
  "ev-ve-metbex-mebel": {
    "ru": "Мебель",
    "en": "Furniture"
  },
  "ev-ve-metbex-isiqlandirma": {
    "ru": "Освещение",
    "en": "Lighting"
  },
  "ev-ve-metbex-dekor-mehsullari": {
    "ru": "Декор",
    "en": "Decor products"
  },
  "ev-ve-metbex-temizlik-vasiteleri": {
    "ru": "Средства для уборки",
    "en": "Cleaning supplies"
  },
  "ev-tekstili": {
    "ru": "Домашний текстиль",
    "en": "Home textiles"
  },
  "ev-tekstili-yataq-destleri": {
    "ru": "Постельные комплекты",
    "en": "Bedding sets"
  },
  "ev-tekstili-yorgan-ve-yastiqlar": {
    "ru": "Одеяла и подушки",
    "en": "Blankets & pillows"
  },
  "ev-tekstili-adyallar-ve-pledler": {
    "ru": "Одеяла и пледы",
    "en": "Throws & blankets"
  },
  "ev-tekstili-desmal-ve-hamam-destleri": {
    "ru": "Полотенца и банные наборы",
    "en": "Towels & bath sets"
  },
  "ev-tekstili-perdeler": {
    "ru": "Шторы",
    "en": "Curtains"
  },
  "ev-tekstili-xalcalar-ve-xali": {
    "ru": "Ковры и паласы",
    "en": "Carpets & rugs"
  },
  "ev-tekstili-sufreler": {
    "ru": "Скатерти",
    "en": "Tablecloths"
  },
  "ev-tekstili-divan-ortukleri": {
    "ru": "Чехлы для диванов",
    "en": "Sofa covers"
  },
  "avtomobil": {
    "ru": "Автомобиль",
    "en": "Automotive"
  },
  "avtomobil-avtomobil-aksesuarlari": {
    "ru": "Автоаксессуары",
    "en": "Car accessories"
  },
  "avtomobil-yag-ve-mayeler": {
    "ru": "Масла и жидкости",
    "en": "Oils & fluids"
  },
  "avtomobil-sinler-ve-diskler": {
    "ru": "Шины и диски",
    "en": "Tires & rims"
  },
  "avtomobil-ehtiyat-hisseleri": {
    "ru": "Запчасти",
    "en": "Spare parts"
  },
  "avtomobil-avtomobil-kimyasi": {
    "ru": "Автохимия",
    "en": "Car care chemicals"
  },
  "avtomobil-salon-aksesuarlari": {
    "ru": "Аксессуары для салона",
    "en": "Interior accessories"
  },
  "avtomobil-avtomobil-aletleri": {
    "ru": "Автоинструменты",
    "en": "Car tools"
  },
  "avtomobil-videoqeydiyyatcilar": {
    "ru": "Видеорегистраторы",
    "en": "Dash cameras"
  },
  "avtomobil-avtomobil-ses-sistemleri": {
    "ru": "Автомобильные аудиосистемы",
    "en": "Car audio systems"
  },
  "avtomobil-motosiklet-aksesuarlari": {
    "ru": "Мотоаксессуары",
    "en": "Motorcycle accessories"
  },
  "tikinti-ve-temir": {
    "ru": "Строительство и ремонт",
    "en": "Construction & repair"
  },
  "tikinti-ve-temir-el-aletleri": {
    "ru": "Ручные инструменты",
    "en": "Hand tools"
  },
  "tikinti-ve-temir-elektrik-aletleri": {
    "ru": "Электроинструменты",
    "en": "Power tools"
  },
  "tikinti-ve-temir-olcu-cihazlari": {
    "ru": "Измерительные приборы",
    "en": "Measuring tools"
  },
  "tikinti-ve-temir-santexnika": {
    "ru": "Сантехника",
    "en": "Plumbing"
  },
  "tikinti-ve-temir-elektrik-materiallari": {
    "ru": "Электроматериалы",
    "en": "Electrical materials"
  },
  "tikinti-ve-temir-boya-ve-laklar": {
    "ru": "Краски и лаки",
    "en": "Paints & varnishes"
  },
  "tikinti-ve-temir-tikinti-materiallari": {
    "ru": "Строительные материалы",
    "en": "Building materials"
  },
  "tikinti-ve-temir-qapi-ve-qifillar": {
    "ru": "Двери и замки",
    "en": "Doors & locks"
  },
  "tikinti-ve-temir-doseme-materiallari": {
    "ru": "Напольные покрытия",
    "en": "Flooring materials"
  },
  "tikinti-ve-temir-divar-kagizlari": {
    "ru": "Обои",
    "en": "Wallpapers"
  },
  "tikinti-ve-temir-is-geyimleri-ve-qoruyucu": {
    "ru": "Рабочая одежда и защита",
    "en": "Workwear & protection"
  },
  "bag-ve-heyet": {
    "ru": "Сад и двор",
    "en": "Garden & yard"
  },
  "bag-ve-heyet-bag-aletleri": {
    "ru": "Садовые инструменты",
    "en": "Garden tools"
  },
  "bag-ve-heyet-toxumlar-ve-soganaqlar": {
    "ru": "Семена и луковицы",
    "en": "Seeds & bulbs"
  },
  "bag-ve-heyet-bitkiler-ve-guller": {
    "ru": "Растения и цветы",
    "en": "Plants & flowers"
  },
  "bag-ve-heyet-gubreler": {
    "ru": "Удобрения",
    "en": "Fertilizers"
  },
  "bag-ve-heyet-suvarma-sistemleri": {
    "ru": "Системы полива",
    "en": "Watering systems"
  },
  "bag-ve-heyet-bag-mebeli": {
    "ru": "Садовая мебель",
    "en": "Garden furniture"
  },
  "bag-ve-heyet-mangal-ve-barbeku": {
    "ru": "Мангалы и барбекю",
    "en": "Grills & BBQ"
  },
  "bag-ve-heyet-hovuzlar": {
    "ru": "Бассейны",
    "en": "Pools"
  },
  "bag-ve-heyet-cemen-bicen": {
    "ru": "Газонокосилки",
    "en": "Lawn mowers"
  },
  "idman-ve-istirahet": {
    "ru": "Спорт и отдых",
    "en": "Sports & leisure"
  },
  "idman-ve-istirahet-fitness-levazimatlari": {
    "ru": "Товары для фитнеса",
    "en": "Fitness equipment"
  },
  "idman-ve-istirahet-trenajorlar": {
    "ru": "Тренажёры",
    "en": "Exercise machines"
  },
  "idman-ve-istirahet-velosipedler": {
    "ru": "Велосипеды",
    "en": "Bicycles"
  },
  "idman-ve-istirahet-samokatlar": {
    "ru": "Самокаты",
    "en": "Scooters"
  },
  "idman-ve-istirahet-komanda-idmani": {
    "ru": "Командные виды спорта",
    "en": "Team sports"
  },
  "idman-ve-istirahet-uzguculuk": {
    "ru": "Плавание",
    "en": "Swimming"
  },
  "idman-ve-istirahet-turizm-ve-kemping": {
    "ru": "Туризм и кемпинг",
    "en": "Tourism & camping"
  },
  "idman-ve-istirahet-ovculuq-ve-baliqciliq": {
    "ru": "Охота и рыбалка",
    "en": "Hunting & fishing"
  },
  "idman-ve-istirahet-qis-idmani": {
    "ru": "Зимние виды спорта",
    "en": "Winter sports"
  },
  "idman-ve-istirahet-doyus-idmani": {
    "ru": "Боевые виды спорта",
    "en": "Martial arts"
  },
  "idman-ve-istirahet-yoga-ve-pilates": {
    "ru": "Йога и пилатес",
    "en": "Yoga & pilates"
  },
  "heyvan-mehsullari": {
    "ru": "Товары для животных",
    "en": "Pet products"
  },
  "heyvan-mehsullari-it-yemleri": {
    "ru": "Корма для собак",
    "en": "Dog food"
  },
  "heyvan-mehsullari-pisik-yemleri": {
    "ru": "Корма для кошек",
    "en": "Cat food"
  },
  "heyvan-mehsullari-qus-yemleri": {
    "ru": "Корма для птиц",
    "en": "Bird food"
  },
  "heyvan-mehsullari-akvarium-levazimatlari": {
    "ru": "Аквариумные принадлежности",
    "en": "Aquarium supplies"
  },
  "heyvan-mehsullari-heyvan-aksesuarlari": {
    "ru": "Аксессуары для животных",
    "en": "Pet accessories"
  },
  "heyvan-mehsullari-qefes-ve-dasiyicilar": {
    "ru": "Клетки и переноски",
    "en": "Cages & carriers"
  },
  "heyvan-mehsullari-gigiyena-vasiteleri": {
    "ru": "Средства гигиены",
    "en": "Hygiene products"
  },
  "heyvan-mehsullari-oyuncaqlar": {
    "ru": "Игрушки",
    "en": "Toys"
  },
  "kitablar-ve-ofis": {
    "ru": "Книги и офис",
    "en": "Books & office"
  },
  "kitablar-ve-ofis-bedii-edebiyyat": {
    "ru": "Художественная литература",
    "en": "Fiction"
  },
  "kitablar-ve-ofis-usaq-kitablari": {
    "ru": "Детские книги",
    "en": "Children’s books"
  },
  "kitablar-ve-ofis-derslikler": {
    "ru": "Учебники",
    "en": "Textbooks"
  },
  "kitablar-ve-ofis-is-ve-biznes": {
    "ru": "Работа и бизнес",
    "en": "Work & business"
  },
  "kitablar-ve-ofis-defterxana-levazimatlari": {
    "ru": "Канцелярские товары",
    "en": "Stationery"
  },
  "kitablar-ve-ofis-yazi-vasiteleri": {
    "ru": "Письменные принадлежности",
    "en": "Writing supplies"
  },
  "kitablar-ve-ofis-kagiz-mehsullari": {
    "ru": "Бумажная продукция",
    "en": "Paper products"
  },
  "kitablar-ve-ofis-ofis-mebeli": {
    "ru": "Офисная мебель",
    "en": "Office furniture"
  },
  "kitablar-ve-ofis-printer-kagizlari": {
    "ru": "Бумага для принтера",
    "en": "Printer paper"
  },
  "erzaq-mehsullari": {
    "ru": "Продукты питания",
    "en": "Groceries"
  },
  "erzaq-mehsullari-cay-ve-qehve": {
    "ru": "Чай и кофе",
    "en": "Tea & coffee"
  },
  "erzaq-mehsullari-sirniyyat": {
    "ru": "Сладости",
    "en": "Sweets"
  },
  "erzaq-mehsullari-sokolad": {
    "ru": "Шоколад",
    "en": "Chocolate"
  },
  "erzaq-mehsullari-pecenye-ve-vafli": {
    "ru": "Печенье и вафли",
    "en": "Cookies & waffles"
  },
  "erzaq-mehsullari-konservler": {
    "ru": "Консервы",
    "en": "Canned food"
  },
  "erzaq-mehsullari-ickiler": {
    "ru": "Напитки",
    "en": "Drinks"
  },
  "erzaq-mehsullari-usaq-qidalari": {
    "ru": "Детское питание",
    "en": "Baby food"
  },
  "erzaq-mehsullari-quru-meyve-ve-qoz": {
    "ru": "Сухофрукты и орехи",
    "en": "Dried fruits & nuts"
  },
  "erzaq-mehsullari-edviyyatlar": {
    "ru": "Специи",
    "en": "Spices"
  },
  "erzaq-mehsullari-saglam-qidalanma": {
    "ru": "Здоровое питание",
    "en": "Healthy food"
  },
  "saglamliq": {
    "ru": "Здоровье",
    "en": "Health"
  },
  "saglamliq-vitaminler": {
    "ru": "Витамины",
    "en": "Vitamins"
  },
  "saglamliq-bae-ve-bioloji-aktiv": {
    "ru": "БАДы и биологически активные добавки",
    "en": "Supplements & bioactive"
  },
  "saglamliq-tibbi-cihazlar": {
    "ru": "Медицинские приборы",
    "en": "Medical devices"
  },
  "saglamliq-tonometrler": {
    "ru": "Тонометры",
    "en": "Blood pressure monitors"
  },
  "saglamliq-termometrler": {
    "ru": "Термометры",
    "en": "Thermometers"
  },
  "saglamliq-inhalyatorlar": {
    "ru": "Ингаляторы",
    "en": "Inhalers"
  },
  "saglamliq-bandaj-ve-ortez": {
    "ru": "Бандажи и ортезы",
    "en": "Bandages & orthoses"
  },
  "saglamliq-gigiyena-mehsullari": {
    "ru": "Гигиенические товары",
    "en": "Hygiene products"
  },
  "saglamliq-ilk-yardim": {
    "ru": "Первая помощь",
    "en": "First aid"
  },
  "saglamliq-optika-ve-eynekler": {
    "ru": "Оптика и очки",
    "en": "Optics & glasses"
  },
  "hediyye-ve-suvenir": {
    "ru": "Подарки и сувениры",
    "en": "Gifts & souvenirs"
  },
  "hediyye-ve-suvenir-hediyye-destleri": {
    "ru": "Подарочные наборы",
    "en": "Gift sets"
  },
  "hediyye-ve-suvenir-hediyye-qutulari": {
    "ru": "Подарочные коробки",
    "en": "Gift boxes"
  },
  "hediyye-ve-suvenir-suvenirler": {
    "ru": "Сувениры",
    "en": "Souvenirs"
  },
  "hediyye-ve-suvenir-bayram-mehsullari": {
    "ru": "Праздничные товары",
    "en": "Holiday products"
  },
  "hediyye-ve-suvenir-yeni-il-mehsullari": {
    "ru": "Новогодние товары",
    "en": "New Year products"
  },
  "hediyye-ve-suvenir-sarlar": {
    "ru": "Шары",
    "en": "Balloons"
  },
  "hediyye-ve-suvenir-suni-guller": {
    "ru": "Искусственные цветы",
    "en": "Artificial flowers"
  },
  "hediyye-ve-suvenir-acarliqlar": {
    "ru": "Брелоки",
    "en": "Keychains"
  },
  "zergerlik-ve-saatlar": {
    "ru": "Украшения и часы",
    "en": "Jewelry & watches"
  },
  "zergerlik-ve-saatlar-uzukler": {
    "ru": "Кольца",
    "en": "Rings"
  },
  "zergerlik-ve-saatlar-boyunbagilar": {
    "ru": "Ожерелья",
    "en": "Necklaces"
  },
  "zergerlik-ve-saatlar-sirgalar": {
    "ru": "Серьги",
    "en": "Earrings"
  },
  "zergerlik-ve-saatlar-qolbaqlar": {
    "ru": "Браслеты",
    "en": "Bracelets"
  },
  "zergerlik-ve-saatlar-kisi-saatlari": {
    "ru": "Мужские часы",
    "en": "Men's watches"
  },
  "zergerlik-ve-saatlar-qadin-saatlari": {
    "ru": "Женские часы",
    "en": "Women's watches"
  },
  "zergerlik-ve-saatlar-usaq-saatlari": {
    "ru": "Детские часы",
    "en": "Kids watches"
  },
  "zergerlik-ve-saatlar-bijuteriya": {
    "ru": "Бижутерия",
    "en": "Fashion jewelry"
  },
  "zergerlik-ve-saatlar-qizil-memulatlar": {
    "ru": "Золотые изделия",
    "en": "Gold jewelry"
  },
  "zergerlik-ve-saatlar-gumus-memulatlar": {
    "ru": "Серебряные изделия",
    "en": "Silver jewelry"
  },
  "oyun-ve-hobbi": {
    "ru": "Игры и хобби",
    "en": "Games & hobby"
  },
  "oyun-ve-hobbi-playstation-oyunlari": {
    "ru": "Игры PlayStation",
    "en": "PlayStation games"
  },
  "oyun-ve-hobbi-xbox-oyunlari": {
    "ru": "Игры Xbox",
    "en": "Xbox games"
  },
  "oyun-ve-hobbi-nintendo-oyunlari": {
    "ru": "Игры Nintendo",
    "en": "Nintendo games"
  },
  "oyun-ve-hobbi-pc-oyunlari": {
    "ru": "Игры для ПК",
    "en": "PC games"
  },
  "oyun-ve-hobbi-stolustu-oyunlar": {
    "ru": "Настольные игры",
    "en": "Board games"
  },
  "oyun-ve-hobbi-pazllar": {
    "ru": "Пазлы",
    "en": "Puzzles"
  },
  "oyun-ve-hobbi-radioidareli-modeller": {
    "ru": "Радиоуправляемые модели",
    "en": "RC models"
  },
  "oyun-ve-hobbi-musiqi-aletleri": {
    "ru": "Музыкальные инструменты",
    "en": "Musical instruments"
  },
  "oyun-ve-hobbi-el-isi-ve-yaradiciliq": {
    "ru": "Рукоделие и творчество",
    "en": "Handmade & creativity"
  },
  "oyun-ve-hobbi-kolleksiya": {
    "ru": "Коллекционирование",
    "en": "Collectibles"
  },
  "cantalar-ve-aksesuarlar": {
    "ru": "Сумки и аксессуары",
    "en": "Bags & accessories"
  },
  "cantalar-ve-aksesuarlar-qadin-cantalari": {
    "ru": "Женские сумки",
    "en": "Women's bags"
  },
  "cantalar-ve-aksesuarlar-kisi-cantalari": {
    "ru": "Мужские сумки",
    "en": "Men's bags"
  },
  "cantalar-ve-aksesuarlar-bel-cantalari": {
    "ru": "Поясные сумки",
    "en": "Waist bags"
  },
  "cantalar-ve-aksesuarlar-ciyin-cantalari": {
    "ru": "Сумки через плечо",
    "en": "Shoulder bags"
  },
  "cantalar-ve-aksesuarlar-seyahet-cantalari": {
    "ru": "Дорожные сумки",
    "en": "Travel bags"
  },
  "cantalar-ve-aksesuarlar-camadanlar": {
    "ru": "Чемоданы",
    "en": "Suitcases"
  },
  "cantalar-ve-aksesuarlar-pulqabilar": {
    "ru": "Кошельки",
    "en": "Wallets"
  },
  "cantalar-ve-aksesuarlar-kemerler": {
    "ru": "Ремни",
    "en": "Belts"
  },
  "cantalar-ve-aksesuarlar-serfler-ve-sallar": {
    "ru": "Шарфы и шали",
    "en": "Scarves & shawls"
  },
  "cantalar-ve-aksesuarlar-papaqlar": {
    "ru": "Шапки",
    "en": "Hats"
  },
  "cantalar-ve-aksesuarlar-eynekler": {
    "ru": "Очки",
    "en": "Glasses"
  },
  "cantalar-ve-aksesuarlar-cetirler": {
    "ru": "Зонты",
    "en": "Umbrellas"
  }
};

const FALLBACK_CATEGORY_NAMES_BY_AZ: Record<string, { ru: string; en: string }> = {
  "Elektronika": {
    "ru": "Электроника",
    "en": "Electronics"
  },
  "Smartfonlar": {
    "ru": "Смартфоны",
    "en": "Smartphones"
  },
  "Telefon aksesuarları": {
    "ru": "Аксессуары для телефонов",
    "en": "Phone accessories"
  },
  "Noutbuklar": {
    "ru": "Ноутбуки",
    "en": "Laptops"
  },
  "Planşetlər": {
    "ru": "Планшеты",
    "en": "Tablets"
  },
  "Stolüstü kompüterlər": {
    "ru": "Настольные компьютеры",
    "en": "Desktop computers"
  },
  "Monitorlar": {
    "ru": "Мониторы",
    "en": "Monitors"
  },
  "Klaviatura və mauslar": {
    "ru": "Клавиатуры и мыши",
    "en": "Keyboards & mice"
  },
  "Yaddaş və disklər": {
    "ru": "Память и диски",
    "en": "Memory & drives"
  },
  "Printerlər və skanerlər": {
    "ru": "Принтеры и сканеры",
    "en": "Printers & scanners"
  },
  "Şəbəkə avadanlığı": {
    "ru": "Сетевое оборудование",
    "en": "Network equipment"
  },
  "Televizorlar": {
    "ru": "Телевизоры",
    "en": "TVs"
  },
  "Audio sistemlər": {
    "ru": "Аудиосистемы",
    "en": "Audio systems"
  },
  "Qulaqlıqlar": {
    "ru": "Наушники",
    "en": "Headphones"
  },
  "Kamera və fotoaparatlar": {
    "ru": "Камеры и фотоаппараты",
    "en": "Cameras & photo"
  },
  "Smart saatlar": {
    "ru": "Умные часы",
    "en": "Smart watches"
  },
  "Oyun konsolları": {
    "ru": "Игровые консоли",
    "en": "Game consoles"
  },
  "Powerbanklar": {
    "ru": "Повербанки",
    "en": "Power banks"
  },
  "Kabellər və adapterlər": {
    "ru": "Кабели и адаптеры",
    "en": "Cables & adapters"
  },
  "Qadın geyimləri": {
    "ru": "Женская одежда",
    "en": "Women's clothing"
  },
  "Donlar": {
    "ru": "Платья",
    "en": "Dresses"
  },
  "Bluzlar və köynəklər": {
    "ru": "Блузки и рубашки",
    "en": "Blouses & shirts"
  },
  "Yubkalar": {
    "ru": "Юбки",
    "en": "Skirts"
  },
  "Şalvarlar": {
    "ru": "Брюки",
    "en": "Pants"
  },
  "Cinslər": {
    "ru": "Джинсы",
    "en": "Jeans"
  },
  "Pencəklər": {
    "ru": "Жакеты",
    "en": "Blazers"
  },
  "Paltolar və kürklər": {
    "ru": "Пальто и шубы",
    "en": "Coats & fur coats"
  },
  "Trikotaj": {
    "ru": "Трикотаж",
    "en": "Knitwear"
  },
  "Alt paltarları": {
    "ru": "Нижнее бельё",
    "en": "Underwear"
  },
  "Pijamalar": {
    "ru": "Пижамы",
    "en": "Pajamas"
  },
  "İdman geyimləri": {
    "ru": "Спортивная одежда",
    "en": "Sportswear"
  },
  "Çimərlik geyimləri": {
    "ru": "Пляжная одежда",
    "en": "Swimwear"
  },
  "Hicab geyimləri": {
    "ru": "Одежда для хиджаба",
    "en": "Hijab clothing"
  },
  "Hamilə geyimləri": {
    "ru": "Одежда для беременных",
    "en": "Maternity clothing"
  },
  "Kişi geyimləri": {
    "ru": "Мужская одежда",
    "en": "Men's clothing"
  },
  "Köynəklər": {
    "ru": "Рубашки",
    "en": "Shirts"
  },
  "Futbolkalar": {
    "ru": "Футболки",
    "en": "T-shirts"
  },
  "Şortlar": {
    "ru": "Шорты",
    "en": "Shorts"
  },
  "Kostyumlar": {
    "ru": "Костюмы",
    "en": "Suits"
  },
  "Paltolar və gödəkçələr": {
    "ru": "Пальто и куртки",
    "en": "Coats & jackets"
  },
  "İş geyimləri": {
    "ru": "Рабочая одежда",
    "en": "Workwear"
  },
  "Uşaq və körpə": {
    "ru": "Детские товары",
    "en": "Kids & baby"
  },
  "Körpə geyimləri": {
    "ru": "Одежда для малышей",
    "en": "Baby clothing"
  },
  "Uşaq geyimləri": {
    "ru": "Детская одежда",
    "en": "Kids clothing"
  },
  "Uşaq ayaqqabıları": {
    "ru": "Детская обувь",
    "en": "Kids shoes"
  },
  "Oyuncaqlar": {
    "ru": "Игрушки",
    "en": "Toys"
  },
  "Konstruktorlar": {
    "ru": "Конструкторы",
    "en": "Building sets"
  },
  "Körpə arabaları": {
    "ru": "Коляски",
    "en": "Strollers"
  },
  "Avtokresloları": {
    "ru": "Автокресла",
    "en": "Car seats"
  },
  "Uşaq qidaları": {
    "ru": "Детское питание",
    "en": "Baby food"
  },
  "Pampers və gigiyena": {
    "ru": "Подгузники и гигиена",
    "en": "Diapers & hygiene"
  },
  "Məktəbli ləvazimatları": {
    "ru": "Школьные принадлежности",
    "en": "School supplies"
  },
  "Uşaq mebeli": {
    "ru": "Детская мебель",
    "en": "Kids furniture"
  },
  "Velosiped və samokat": {
    "ru": "Велосипеды и самокаты",
    "en": "Bikes & scooters"
  },
  "Ayaqqabı": {
    "ru": "Обувь",
    "en": "Shoes"
  },
  "Qadın ayaqqabıları": {
    "ru": "Женская обувь",
    "en": "Women's shoes"
  },
  "Kişi ayaqqabıları": {
    "ru": "Мужская обувь",
    "en": "Men's shoes"
  },
  "İdman ayaqqabıları": {
    "ru": "Спортивная обувь",
    "en": "Sports shoes"
  },
  "Krossovkalar": {
    "ru": "Кроссовки",
    "en": "Sneakers"
  },
  "Çəkmələr": {
    "ru": "Сапоги и ботинки",
    "en": "Boots"
  },
  "Sandallar": {
    "ru": "Сандалии",
    "en": "Sandals"
  },
  "Klassik ayaqqabılar": {
    "ru": "Классическая обувь",
    "en": "Classic shoes"
  },
  "Ev ayaqqabıları": {
    "ru": "Домашняя обувь",
    "en": "Home shoes"
  },
  "Rezin çəkmələr": {
    "ru": "Резиновые сапоги",
    "en": "Rubber boots"
  },
  "Gözəllik və baxım": {
    "ru": "Красота и уход",
    "en": "Beauty & care"
  },
  "Dekorativ kosmetika": {
    "ru": "Декоративная косметика",
    "en": "Makeup"
  },
  "Üz baxımı": {
    "ru": "Уход за лицом",
    "en": "Face care"
  },
  "Saç baxımı": {
    "ru": "Уход за волосами",
    "en": "Hair care"
  },
  "Bədən baxımı": {
    "ru": "Уход за телом",
    "en": "Body care"
  },
  "Ətirlər": {
    "ru": "Парфюмерия",
    "en": "Perfumes"
  },
  "Manikür və pedikür": {
    "ru": "Маникюр и педикюр",
    "en": "Manicure & pedicure"
  },
  "Kişi baxımı": {
    "ru": "Мужской уход",
    "en": "Men's care"
  },
  "Saç qurutma və düzəltmə": {
    "ru": "Сушка и укладка волос",
    "en": "Hair dryers & styling"
  },
  "Epilyasiya cihazları": {
    "ru": "Эпиляторы",
    "en": "Hair removal devices"
  },
  "Ağız gigiyenası": {
    "ru": "Гигиена полости рта",
    "en": "Oral hygiene"
  },
  "Professional vasitələr": {
    "ru": "Профессиональные средства",
    "en": "Professional products"
  },
  "Ev və mətbəx": {
    "ru": "Дом и кухня",
    "en": "Home & kitchen"
  },
  "Qab-qacaq": {
    "ru": "Посуда",
    "en": "Tableware"
  },
  "Çəngəl-bıçaq dəstləri": {
    "ru": "Столовые приборы",
    "en": "Cutlery sets"
  },
  "Tavalar və qazanlar": {
    "ru": "Сковороды и кастрюли",
    "en": "Pans & pots"
  },
  "Bıçaqlar": {
    "ru": "Ножи",
    "en": "Knives"
  },
  "Kiçik məişət texnikası": {
    "ru": "Мелкая бытовая техника",
    "en": "Small appliances"
  },
  "Böyük məişət texnikası": {
    "ru": "Крупная бытовая техника",
    "en": "Large appliances"
  },
  "Tozsoranlar": {
    "ru": "Пылесосы",
    "en": "Vacuum cleaners"
  },
  "Ütülər": {
    "ru": "Утюги",
    "en": "Irons"
  },
  "Mətbəx aksesuarları": {
    "ru": "Кухонные аксессуары",
    "en": "Kitchen accessories"
  },
  "Saxlama qabları": {
    "ru": "Контейнеры для хранения",
    "en": "Storage containers"
  },
  "Mebel": {
    "ru": "Мебель",
    "en": "Furniture"
  },
  "İşıqlandırma": {
    "ru": "Освещение",
    "en": "Lighting"
  },
  "Dekor məhsulları": {
    "ru": "Декор",
    "en": "Decor products"
  },
  "Təmizlik vasitələri": {
    "ru": "Средства для уборки",
    "en": "Cleaning supplies"
  },
  "Ev tekstili": {
    "ru": "Домашний текстиль",
    "en": "Home textiles"
  },
  "Yataq dəstləri": {
    "ru": "Постельные комплекты",
    "en": "Bedding sets"
  },
  "Yorğan və yastıqlar": {
    "ru": "Одеяла и подушки",
    "en": "Blankets & pillows"
  },
  "Adyallar və pledlər": {
    "ru": "Одеяла и пледы",
    "en": "Throws & blankets"
  },
  "Dəsmal və hamam dəstləri": {
    "ru": "Полотенца и банные наборы",
    "en": "Towels & bath sets"
  },
  "Pərdələr": {
    "ru": "Шторы",
    "en": "Curtains"
  },
  "Xalçalar və xalı": {
    "ru": "Ковры и паласы",
    "en": "Carpets & rugs"
  },
  "Süfrələr": {
    "ru": "Скатерти",
    "en": "Tablecloths"
  },
  "Divan örtükləri": {
    "ru": "Чехлы для диванов",
    "en": "Sofa covers"
  },
  "Avtomobil": {
    "ru": "Автомобиль",
    "en": "Automotive"
  },
  "Avtomobil aksesuarları": {
    "ru": "Автоаксессуары",
    "en": "Car accessories"
  },
  "Yağ və mayelər": {
    "ru": "Масла и жидкости",
    "en": "Oils & fluids"
  },
  "Şinlər və disklər": {
    "ru": "Шины и диски",
    "en": "Tires & rims"
  },
  "Ehtiyat hissələri": {
    "ru": "Запчасти",
    "en": "Spare parts"
  },
  "Avtomobil kimyası": {
    "ru": "Автохимия",
    "en": "Car care chemicals"
  },
  "Salon aksesuarları": {
    "ru": "Аксессуары для салона",
    "en": "Interior accessories"
  },
  "Avtomobil alətləri": {
    "ru": "Автоинструменты",
    "en": "Car tools"
  },
  "Videoqeydiyyatçılar": {
    "ru": "Видеорегистраторы",
    "en": "Dash cameras"
  },
  "Avtomobil səs sistemləri": {
    "ru": "Автомобильные аудиосистемы",
    "en": "Car audio systems"
  },
  "Motosiklet aksesuarları": {
    "ru": "Мотоаксессуары",
    "en": "Motorcycle accessories"
  },
  "Tikinti və təmir": {
    "ru": "Строительство и ремонт",
    "en": "Construction & repair"
  },
  "Əl alətləri": {
    "ru": "Ручные инструменты",
    "en": "Hand tools"
  },
  "Elektrik alətləri": {
    "ru": "Электроинструменты",
    "en": "Power tools"
  },
  "Ölçü cihazları": {
    "ru": "Измерительные приборы",
    "en": "Measuring tools"
  },
  "Santexnika": {
    "ru": "Сантехника",
    "en": "Plumbing"
  },
  "Elektrik materialları": {
    "ru": "Электроматериалы",
    "en": "Electrical materials"
  },
  "Boya və laklar": {
    "ru": "Краски и лаки",
    "en": "Paints & varnishes"
  },
  "Tikinti materialları": {
    "ru": "Строительные материалы",
    "en": "Building materials"
  },
  "Qapı və qıfıllar": {
    "ru": "Двери и замки",
    "en": "Doors & locks"
  },
  "Döşəmə materialları": {
    "ru": "Напольные покрытия",
    "en": "Flooring materials"
  },
  "Divar kağızları": {
    "ru": "Обои",
    "en": "Wallpapers"
  },
  "İş geyimləri və qoruyucu": {
    "ru": "Рабочая одежда и защита",
    "en": "Workwear & protection"
  },
  "Bağ və həyət": {
    "ru": "Сад и двор",
    "en": "Garden & yard"
  },
  "Bağ alətləri": {
    "ru": "Садовые инструменты",
    "en": "Garden tools"
  },
  "Toxumlar və soğanaqlar": {
    "ru": "Семена и луковицы",
    "en": "Seeds & bulbs"
  },
  "Bitkilər və güllər": {
    "ru": "Растения и цветы",
    "en": "Plants & flowers"
  },
  "Gübrələr": {
    "ru": "Удобрения",
    "en": "Fertilizers"
  },
  "Suvarma sistemləri": {
    "ru": "Системы полива",
    "en": "Watering systems"
  },
  "Bağ mebeli": {
    "ru": "Садовая мебель",
    "en": "Garden furniture"
  },
  "Mangal və barbekü": {
    "ru": "Мангалы и барбекю",
    "en": "Grills & BBQ"
  },
  "Hovuzlar": {
    "ru": "Бассейны",
    "en": "Pools"
  },
  "Çəmən biçən": {
    "ru": "Газонокосилки",
    "en": "Lawn mowers"
  },
  "İdman və istirahət": {
    "ru": "Спорт и отдых",
    "en": "Sports & leisure"
  },
  "Fitness ləvazimatları": {
    "ru": "Товары для фитнеса",
    "en": "Fitness equipment"
  },
  "Trenajorlar": {
    "ru": "Тренажёры",
    "en": "Exercise machines"
  },
  "Velosipedlər": {
    "ru": "Велосипеды",
    "en": "Bicycles"
  },
  "Samokatlar": {
    "ru": "Самокаты",
    "en": "Scooters"
  },
  "Komanda idmanı": {
    "ru": "Командные виды спорта",
    "en": "Team sports"
  },
  "Üzgüçülük": {
    "ru": "Плавание",
    "en": "Swimming"
  },
  "Turizm və kemping": {
    "ru": "Туризм и кемпинг",
    "en": "Tourism & camping"
  },
  "Ovçuluq və balıqçılıq": {
    "ru": "Охота и рыбалка",
    "en": "Hunting & fishing"
  },
  "Qış idmanı": {
    "ru": "Зимние виды спорта",
    "en": "Winter sports"
  },
  "Döyüş idmanı": {
    "ru": "Боевые виды спорта",
    "en": "Martial arts"
  },
  "Yoga və pilates": {
    "ru": "Йога и пилатес",
    "en": "Yoga & pilates"
  },
  "Heyvan məhsulları": {
    "ru": "Товары для животных",
    "en": "Pet products"
  },
  "İt yemləri": {
    "ru": "Корма для собак",
    "en": "Dog food"
  },
  "Pişik yemləri": {
    "ru": "Корма для кошек",
    "en": "Cat food"
  },
  "Quş yemləri": {
    "ru": "Корма для птиц",
    "en": "Bird food"
  },
  "Akvarium ləvazimatları": {
    "ru": "Аквариумные принадлежности",
    "en": "Aquarium supplies"
  },
  "Heyvan aksesuarları": {
    "ru": "Аксессуары для животных",
    "en": "Pet accessories"
  },
  "Qəfəs və daşıyıcılar": {
    "ru": "Клетки и переноски",
    "en": "Cages & carriers"
  },
  "Gigiyena vasitələri": {
    "ru": "Средства гигиены",
    "en": "Hygiene products"
  },
  "Kitablar və ofis": {
    "ru": "Книги и офис",
    "en": "Books & office"
  },
  "Bədii ədəbiyyat": {
    "ru": "Художественная литература",
    "en": "Fiction"
  },
  "Uşaq kitabları": {
    "ru": "Детские книги",
    "en": "Children’s books"
  },
  "Dərsliklər": {
    "ru": "Учебники",
    "en": "Textbooks"
  },
  "İş və biznes": {
    "ru": "Работа и бизнес",
    "en": "Work & business"
  },
  "Dəftərxana ləvazimatları": {
    "ru": "Канцелярские товары",
    "en": "Stationery"
  },
  "Yazı vasitələri": {
    "ru": "Письменные принадлежности",
    "en": "Writing supplies"
  },
  "Kağız məhsulları": {
    "ru": "Бумажная продукция",
    "en": "Paper products"
  },
  "Ofis mebeli": {
    "ru": "Офисная мебель",
    "en": "Office furniture"
  },
  "Printer kağızları": {
    "ru": "Бумага для принтера",
    "en": "Printer paper"
  },
  "Ərzaq məhsulları": {
    "ru": "Продукты питания",
    "en": "Groceries"
  },
  "Çay və qəhvə": {
    "ru": "Чай и кофе",
    "en": "Tea & coffee"
  },
  "Şirniyyat": {
    "ru": "Сладости",
    "en": "Sweets"
  },
  "Şokolad": {
    "ru": "Шоколад",
    "en": "Chocolate"
  },
  "Peçenye və vafli": {
    "ru": "Печенье и вафли",
    "en": "Cookies & waffles"
  },
  "Konservlər": {
    "ru": "Консервы",
    "en": "Canned food"
  },
  "İçkilər": {
    "ru": "Напитки",
    "en": "Drinks"
  },
  "Quru meyvə və qoz": {
    "ru": "Сухофрукты и орехи",
    "en": "Dried fruits & nuts"
  },
  "Ədviyyatlar": {
    "ru": "Специи",
    "en": "Spices"
  },
  "Sağlam qidalanma": {
    "ru": "Здоровое питание",
    "en": "Healthy food"
  },
  "Sağlamlıq": {
    "ru": "Здоровье",
    "en": "Health"
  },
  "Vitaminlər": {
    "ru": "Витамины",
    "en": "Vitamins"
  },
  "BAƏ və bioloji aktiv": {
    "ru": "БАДы и биологически активные добавки",
    "en": "Supplements & bioactive"
  },
  "Tibbi cihazlar": {
    "ru": "Медицинские приборы",
    "en": "Medical devices"
  },
  "Tonometrlər": {
    "ru": "Тонометры",
    "en": "Blood pressure monitors"
  },
  "Termometrlər": {
    "ru": "Термометры",
    "en": "Thermometers"
  },
  "İnhalyatorlar": {
    "ru": "Ингаляторы",
    "en": "Inhalers"
  },
  "Bandaj və ortez": {
    "ru": "Бандажи и ортезы",
    "en": "Bandages & orthoses"
  },
  "Gigiyena məhsulları": {
    "ru": "Гигиенические товары",
    "en": "Hygiene products"
  },
  "İlk yardım": {
    "ru": "Первая помощь",
    "en": "First aid"
  },
  "Optika və eynəklər": {
    "ru": "Оптика и очки",
    "en": "Optics & glasses"
  },
  "Hədiyyə və suvenir": {
    "ru": "Подарки и сувениры",
    "en": "Gifts & souvenirs"
  },
  "Hədiyyə dəstləri": {
    "ru": "Подарочные наборы",
    "en": "Gift sets"
  },
  "Hədiyyə qutuları": {
    "ru": "Подарочные коробки",
    "en": "Gift boxes"
  },
  "Suvenirlər": {
    "ru": "Сувениры",
    "en": "Souvenirs"
  },
  "Bayram məhsulları": {
    "ru": "Праздничные товары",
    "en": "Holiday products"
  },
  "Yeni il məhsulları": {
    "ru": "Новогодние товары",
    "en": "New Year products"
  },
  "Şarlar": {
    "ru": "Шары",
    "en": "Balloons"
  },
  "Süni güllər": {
    "ru": "Искусственные цветы",
    "en": "Artificial flowers"
  },
  "Açarlıqlar": {
    "ru": "Брелоки",
    "en": "Keychains"
  },
  "Zərgərlik və saatlar": {
    "ru": "Украшения и часы",
    "en": "Jewelry & watches"
  },
  "Üzüklər": {
    "ru": "Кольца",
    "en": "Rings"
  },
  "Boyunbağılar": {
    "ru": "Ожерелья",
    "en": "Necklaces"
  },
  "Sırğalar": {
    "ru": "Серьги",
    "en": "Earrings"
  },
  "Qolbaqlar": {
    "ru": "Браслеты",
    "en": "Bracelets"
  },
  "Kişi saatları": {
    "ru": "Мужские часы",
    "en": "Men's watches"
  },
  "Qadın saatları": {
    "ru": "Женские часы",
    "en": "Women's watches"
  },
  "Uşaq saatları": {
    "ru": "Детские часы",
    "en": "Kids watches"
  },
  "Bijuteriya": {
    "ru": "Бижутерия",
    "en": "Fashion jewelry"
  },
  "Qızıl məmulatlar": {
    "ru": "Золотые изделия",
    "en": "Gold jewelry"
  },
  "Gümüş məmulatlar": {
    "ru": "Серебряные изделия",
    "en": "Silver jewelry"
  },
  "Oyun və hobbi": {
    "ru": "Игры и хобби",
    "en": "Games & hobby"
  },
  "PlayStation oyunları": {
    "ru": "Игры PlayStation",
    "en": "PlayStation games"
  },
  "Xbox oyunları": {
    "ru": "Игры Xbox",
    "en": "Xbox games"
  },
  "Nintendo oyunları": {
    "ru": "Игры Nintendo",
    "en": "Nintendo games"
  },
  "PC oyunları": {
    "ru": "Игры для ПК",
    "en": "PC games"
  },
  "Stolüstü oyunlar": {
    "ru": "Настольные игры",
    "en": "Board games"
  },
  "Pazllar": {
    "ru": "Пазлы",
    "en": "Puzzles"
  },
  "Radioidarəli modellər": {
    "ru": "Радиоуправляемые модели",
    "en": "RC models"
  },
  "Musiqi alətləri": {
    "ru": "Музыкальные инструменты",
    "en": "Musical instruments"
  },
  "Əl işi və yaradıcılıq": {
    "ru": "Рукоделие и творчество",
    "en": "Handmade & creativity"
  },
  "Kolleksiya": {
    "ru": "Коллекционирование",
    "en": "Collectibles"
  },
  "Çantalar və aksesuarlar": {
    "ru": "Сумки и аксессуары",
    "en": "Bags & accessories"
  },
  "Qadın çantaları": {
    "ru": "Женские сумки",
    "en": "Women's bags"
  },
  "Kişi çantaları": {
    "ru": "Мужские сумки",
    "en": "Men's bags"
  },
  "Bel çantaları": {
    "ru": "Поясные сумки",
    "en": "Waist bags"
  },
  "Çiyin çantaları": {
    "ru": "Сумки через плечо",
    "en": "Shoulder bags"
  },
  "Səyahət çantaları": {
    "ru": "Дорожные сумки",
    "en": "Travel bags"
  },
  "Çamadanlar": {
    "ru": "Чемоданы",
    "en": "Suitcases"
  },
  "Pulqabılar": {
    "ru": "Кошельки",
    "en": "Wallets"
  },
  "Kəmərlər": {
    "ru": "Ремни",
    "en": "Belts"
  },
  "Şərflər və şallar": {
    "ru": "Шарфы и шали",
    "en": "Scarves & shawls"
  },
  "Papaqlar": {
    "ru": "Шапки",
    "en": "Hats"
  },
  "Eynəklər": {
    "ru": "Очки",
    "en": "Glasses"
  },
  "Çətirlər": {
    "ru": "Зонты",
    "en": "Umbrellas"
  }
};

Object.assign(FALLBACK_CATEGORY_NAMES, WILDBERRIES_CATEGORY_NAMES);

export function catName(c: LocalizedCategory | null | undefined): string {
  if (!c) return "";
  const lang = i18n.resolvedLanguage || i18n.language || "az";
  if (lang.startsWith("ru") && c.name_ru) return c.name_ru;
  if (lang.startsWith("en") && c.name_en) return c.name_en;
  const fallback = c.slug ? FALLBACK_CATEGORY_NAMES[c.slug] : undefined;
  const nameFallback = FALLBACK_CATEGORY_NAMES_BY_AZ[c.name];
  if (lang.startsWith("ru") && (fallback?.ru || nameFallback?.ru)) return fallback?.ru || nameFallback!.ru;
  if (lang.startsWith("en") && (fallback?.en || nameFallback?.en)) return fallback?.en || nameFallback!.en;
  return c.name;
}
