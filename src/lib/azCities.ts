// Bütün Azərbaycan şəhər və rayonları, Qarabağ daxil
// Koordinatlar (lat, lng) — şəhər mərkəzləri
export interface AzCity { name: string; lat: number; lng: number; region?: string }

export const AZ_CITIES: AzCity[] = [
  // Bakı və ətrafı
  { name: "Bakı", lat: 40.4093, lng: 49.8671, region: "Abşeron" },
  { name: "Sumqayıt", lat: 40.5897, lng: 49.6686, region: "Abşeron" },
  { name: "Xırdalan", lat: 40.4501, lng: 49.7331, region: "Abşeron" },
  { name: "Abşeron", lat: 40.4500, lng: 49.7500, region: "Abşeron" },

  // Aran iqtisadi rayonu
  { name: "Gəncə", lat: 40.6828, lng: 46.3606, region: "Gəncə-Qazax" },
  { name: "Mingəçevir", lat: 40.7700, lng: 47.0500, region: "Aran" },
  { name: "Yevlax", lat: 40.6190, lng: 47.1500, region: "Aran" },
  { name: "Şirvan", lat: 39.9266, lng: 48.9210, region: "Aran" },
  { name: "Sabirabad", lat: 40.0086, lng: 48.4694, region: "Aran" },
  { name: "Saatlı", lat: 39.9100, lng: 48.3597, region: "Aran" },
  { name: "İmişli", lat: 39.8694, lng: 48.0664, region: "Aran" },
  { name: "Beyləqan", lat: 39.7722, lng: 47.6156, region: "Aran" },
  { name: "Ağcabədi", lat: 40.0531, lng: 47.4581, region: "Aran" },
  { name: "Bərdə", lat: 40.3744, lng: 47.1264, region: "Aran" },
  { name: "Tərtər", lat: 40.3447, lng: 46.9358, region: "Aran" },
  { name: "Goranboy", lat: 40.6094, lng: 46.7894, region: "Gəncə-Qazax" },
  { name: "Samux", lat: 40.7589, lng: 46.4150, region: "Gəncə-Qazax" },
  { name: "Şəmkir", lat: 40.8294, lng: 46.0167, region: "Gəncə-Qazax" },
  { name: "Tovuz", lat: 40.9925, lng: 45.6306, region: "Gəncə-Qazax" },
  { name: "Qazax", lat: 41.0931, lng: 45.3669, region: "Gəncə-Qazax" },
  { name: "Ağstafa", lat: 41.1175, lng: 45.4475, region: "Gəncə-Qazax" },
  { name: "Daşkəsən", lat: 40.5197, lng: 46.0789, region: "Gəncə-Qazax" },
  { name: "Gədəbəy", lat: 40.5694, lng: 45.8136, region: "Gəncə-Qazax" },
  { name: "Naftalan", lat: 40.5072, lng: 46.8225, region: "Gəncə-Qazax" },
  { name: "Göygöl", lat: 40.5878, lng: 46.3289, region: "Gəncə-Qazax" },
  { name: "Kürdəmir", lat: 40.3700, lng: 48.1647, region: "Aran" },
  { name: "Ucar", lat: 40.5072, lng: 47.6492, region: "Aran" },
  { name: "Zərdab", lat: 40.2169, lng: 47.7117, region: "Aran" },
  { name: "Hacıqabul", lat: 40.0392, lng: 48.9203, region: "Aran" },
  { name: "Salyan", lat: 39.5783, lng: 48.9711, region: "Aran" },
  { name: "Neftçala", lat: 39.3878, lng: 49.2436, region: "Aran" },
  { name: "Biləsuvar", lat: 39.4592, lng: 48.5511, region: "Aran" },
  { name: "Ağsu", lat: 40.5697, lng: 48.4039, region: "Aran" },
  { name: "Göyçay", lat: 40.6531, lng: 47.7406, region: "Aran" },

  // Dağlıq Şirvan
  { name: "Şamaxı", lat: 40.6311, lng: 48.6411, region: "Dağlıq Şirvan" },
  { name: "İsmayıllı", lat: 40.7872, lng: 48.1525, region: "Dağlıq Şirvan" },
  { name: "Qobustan", lat: 40.5333, lng: 48.9333, region: "Dağlıq Şirvan" },

  // Quba-Xaçmaz
  { name: "Quba", lat: 41.3614, lng: 48.5128, region: "Quba-Xaçmaz" },
  { name: "Qusar", lat: 41.4275, lng: 48.4297, region: "Quba-Xaçmaz" },
  { name: "Xaçmaz", lat: 41.4592, lng: 48.8019, region: "Quba-Xaçmaz" },
  { name: "Şabran", lat: 41.2189, lng: 48.9897, region: "Quba-Xaçmaz" },
  { name: "Siyəzən", lat: 41.0789, lng: 49.1108, region: "Quba-Xaçmaz" },

  // Şəki-Zaqatala
  { name: "Şəki", lat: 41.1919, lng: 47.1706, region: "Şəki-Zaqatala" },
  { name: "Zaqatala", lat: 41.6311, lng: 46.6447, region: "Şəki-Zaqatala" },
  { name: "Balakən", lat: 41.7036, lng: 46.4044, region: "Şəki-Zaqatala" },
  { name: "Qax", lat: 41.4203, lng: 46.9311, region: "Şəki-Zaqatala" },
  { name: "Oğuz", lat: 41.0719, lng: 47.4633, region: "Şəki-Zaqatala" },
  { name: "Qəbələ", lat: 40.9933, lng: 47.8453, region: "Şəki-Zaqatala" },

  // Lənkəran-Astara (Cənub)
  { name: "Lənkəran", lat: 38.7528, lng: 48.8475, region: "Lənkəran" },
  { name: "Astara", lat: 38.4592, lng: 48.8722, region: "Lənkəran" },
  { name: "Lerik", lat: 38.7728, lng: 48.4147, region: "Lənkəran" },
  { name: "Masallı", lat: 39.0339, lng: 48.6589, region: "Lənkəran" },
  { name: "Yardımlı", lat: 38.9081, lng: 48.2497, region: "Lənkəran" },
  { name: "Cəlilabad", lat: 39.2058, lng: 48.4956, region: "Lənkəran" },

  // Naxçıvan MR
  { name: "Naxçıvan", lat: 39.2089, lng: 45.4122, region: "Naxçıvan" },
  { name: "Şərur", lat: 39.5547, lng: 44.9844, region: "Naxçıvan" },
  { name: "Babək", lat: 39.1525, lng: 45.4475, region: "Naxçıvan" },
  { name: "Culfa", lat: 38.9606, lng: 45.6300, region: "Naxçıvan" },
  { name: "Ordubad", lat: 38.9028, lng: 46.0247, region: "Naxçıvan" },
  { name: "Sədərək", lat: 39.7117, lng: 44.8869, region: "Naxçıvan" },
  { name: "Şahbuz", lat: 39.4083, lng: 45.5683, region: "Naxçıvan" },
  { name: "Kəngərli", lat: 39.3917, lng: 45.1653, region: "Naxçıvan" },

  // Qarabağ — azad olunmuş ərazilər
  { name: "Şuşa", lat: 39.7536, lng: 46.7497, region: "Qarabağ" },
  { name: "Xankəndi", lat: 39.8266, lng: 46.7647, region: "Qarabağ" },
  { name: "Xocalı", lat: 39.9136, lng: 46.7944, region: "Qarabağ" },
  { name: "Xocavənd", lat: 39.7919, lng: 47.1108, region: "Qarabağ" },
  { name: "Ağdam", lat: 39.9911, lng: 46.9297, region: "Qarabağ" },
  { name: "Füzuli", lat: 39.6028, lng: 47.1392, region: "Qarabağ" },
  { name: "Cəbrayıl", lat: 39.3994, lng: 47.0244, region: "Şərqi Zəngəzur" },
  { name: "Zəngilan", lat: 39.0833, lng: 46.6519, region: "Şərqi Zəngəzur" },
  { name: "Qubadlı", lat: 39.3464, lng: 46.5797, region: "Şərqi Zəngəzur" },
  { name: "Laçın", lat: 39.6383, lng: 46.5461, region: "Şərqi Zəngəzur" },
  { name: "Kəlbəcər", lat: 40.1014, lng: 46.0386, region: "Şərqi Zəngəzur" },
  { name: "Ağdərə", lat: 40.2103, lng: 46.8211, region: "Qarabağ" },

  // Digər
  { name: "Dəvəçi", lat: 41.2019, lng: 48.9794, region: "Quba-Xaçmaz" },
];

export const AZ_CITY_NAMES = AZ_CITIES.map((c) => c.name);

export function findCity(name?: string | null): AzCity | undefined {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  return AZ_CITIES.find((c) => c.name.toLowerCase() === n);
}
