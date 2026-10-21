// The game's own systems and threats (scripts/autoload/gs.gd BASE_WEAPONS / BASE_ENEMIES), names in three languages.
window.UAD_WEAPONS = [
 {
  "id": "mg",
  "ru": "Пикап с пулемётом",
  "uk": "Пікап з кулеметом",
  "en": "Machine-gun pickup",
  "kind": "gun",
  "class": "gun",
  "range": 1800.0,
  "damage": 8.0,
  "unlock": 0
 },
 {
  "id": "zu23",
  "ru": "ЗУ-23-2 (23 мм)",
  "uk": "ЗУ-23-2 (23 мм)",
  "en": "ZU-23-2 (23 mm)",
  "kind": "gun",
  "class": "gun",
  "range": 2500.0,
  "damage": 11.0,
  "unlock": 3500
 },
 {
  "id": "shilka",
  "ru": "ЗСУ-23-4 «Шилка»",
  "uk": "ЗСУ-23-4 «Шилка»",
  "en": "ZSU-23-4 Shilka",
  "kind": "gun",
  "class": "gun",
  "range": 2500.0,
  "damage": 12.0,
  "unlock": 12000
 },
 {
  "id": "gepard",
  "ru": "Gepard 35 мм",
  "uk": "Gepard 35 мм",
  "en": "Gepard 35 mm",
  "kind": "gun",
  "class": "gun",
  "range": 4000.0,
  "damage": 16.0,
  "unlock": 9000
 },
 {
  "id": "igla",
  "ru": "ПЗРК «Игла» (расчёт)",
  "uk": "ПЗРК «Ігла» (розрахунок)",
  "en": "Igla MANPADS team",
  "kind": "missile",
  "class": "short",
  "range": 5200.0,
  "damage": 90.0,
  "unlock": 5000
 },
 {
  "id": "avenger",
  "ru": "Avenger (Stinger)",
  "uk": "Avenger (Stinger)",
  "en": "Avenger (Stinger)",
  "kind": "missile",
  "class": "short",
  "range": 4800.0,
  "damage": 115.0,
  "unlock": 13000
 },
 {
  "id": "drone",
  "ru": "Дрон-перехватчик «Шершень»",
  "uk": "Дрон-перехоплювач «Шершень»",
  "en": "Hornet interceptor drone",
  "kind": "drone",
  "class": "short",
  "range": 12000.0,
  "damage": 130.0,
  "unlock": 16000
 },
 {
  "id": "osa",
  "ru": "ЗРК «Оса-АКМ»",
  "uk": "ЗРК «Оса-АКМ»",
  "en": "Osa-AKM SAM",
  "kind": "missile",
  "class": "medium",
  "range": 10000.0,
  "damage": 165.0,
  "unlock": 19000
 },
 {
  "id": "nasams",
  "ru": "NASAMS (AMRAAM)",
  "uk": "NASAMS (AMRAAM)",
  "en": "NASAMS (AMRAAM)",
  "kind": "missile",
  "class": "medium",
  "range": 25000.0,
  "damage": 220.0,
  "unlock": 23000
 },
 {
  "id": "iris",
  "ru": "IRIS-T SLM",
  "uk": "IRIS-T SLM",
  "en": "IRIS-T SLM",
  "kind": "missile",
  "class": "medium",
  "range": 40000.0,
  "damage": 250.0,
  "unlock": 28000
 },
 {
  "id": "buk",
  "ru": "«Бук-М1» (ЗРК)",
  "uk": "«Бук-М1» (ЗРК)",
  "en": "Buk-M1 SAM",
  "kind": "missile",
  "class": "long",
  "range": 35000.0,
  "damage": 300.0,
  "unlock": 34000
 },
 {
  "id": "s300",
  "ru": "С-300ПС",
  "uk": "С-300ПС",
  "en": "S-300PS",
  "kind": "missile",
  "class": "long",
  "range": 75000.0,
  "damage": 360.0,
  "unlock": 45000
 },
 {
  "id": "patriot",
  "ru": "Patriot PAC-3",
  "uk": "Patriot PAC-3",
  "en": "Patriot PAC-3",
  "kind": "missile",
  "class": "long",
  "range": 60000.0,
  "damage": 450.0,
  "unlock": 55000
 },
 {
  "id": "s400",
  "ru": "С-400 «Триумф»",
  "uk": "С-400 «Тріумф»",
  "en": "S-400 Triumf",
  "kind": "missile",
  "class": "long",
  "range": 250000.0,
  "damage": 420.0,
  "unlock": 80000
 },
 {
  "id": "s500",
  "ru": "С-500 «Прометей»",
  "uk": "С-500 «Прометей»",
  "en": "S-500 Prometey",
  "kind": "missile",
  "class": "long",
  "range": 500000.0,
  "damage": 520.0,
  "unlock": 130000
 }
];
window.UAD_ENEMIES = [
 {
  "id": "scout",
  "ru": "Разведчик «Орлан»",
  "uk": "Розвідник «Орлан»",
  "en": "Orlan recon drone",
  "hp": 24.0,
  "speed": 33.0,
  "reward": 2000,
  "kind": "scout"
 },
 {
  "id": "shahed",
  "ru": "Шахед",
  "uk": "Шахед",
  "en": "Shahed",
  "hp": 28.0,
  "speed": 51.0,
  "reward": 1300,
  "kind": "shahed"
 },
 {
  "id": "cruise",
  "ru": "Крылатая ракета Х-101",
  "uk": "Крилата ракета Х-101",
  "en": "Kh-101 cruise missile",
  "hp": 60.0,
  "speed": 200.0,
  "reward": 5000,
  "kind": "cruise"
 },
 {
  "id": "ballistic",
  "ru": "Баллистическая ракета",
  "uk": "Балістична ракета",
  "en": "Ballistic missile",
  "kind": "ballistic",
  "hp": 90.0,
  "speed": 0.0,
  "reward": 11000
 },
 {
  "id": "gerbera",
  "ru": "Ложная цель «Гербера»",
  "uk": "Хибна ціль «Гербера»",
  "en": "Gerbera decoy drone",
  "kind": "shahed",
  "hp": 12.0,
  "speed": 44.0,
  "reward": 400
 },
 {
  "id": "geran3",
  "ru": "Реактивный шахед «Герань-3»",
  "uk": "Реактивний шахед «Герань-3»",
  "en": "Geran-3 jet Shahed",
  "kind": "shahed",
  "hp": 32.0,
  "speed": 155.0,
  "reward": 2600
 },
 {
  "id": "geran4",
  "ru": "Реактивный дрон «Герань-4»",
  "uk": "Реактивний дрон «Герань-4»",
  "en": "Geran-4 jet drone",
  "kind": "shahed",
  "hp": 34.0,
  "speed": 110.0,
  "reward": 3200
 },
 {
  "id": "geran5",
  "ru": "Дрон-ракета «Герань-5»",
  "uk": "Дрон-ракета «Герань-5»",
  "en": "Geran-5 missile drone",
  "kind": "shahed",
  "hp": 46.0,
  "speed": 150.0,
  "reward": 4200
 },
 {
  "id": "molniya",
  "ru": "Дрон «Молния»",
  "uk": "Дрон «Молнія»",
  "en": "Molniya drone",
  "kind": "shahed",
  "hp": 10.0,
  "speed": 30.0,
  "reward": 450
 },
 {
  "id": "kalibr",
  "ru": "Крылатая ракета «Калибр»",
  "uk": "Крилата ракета «Калібр»",
  "en": "Kalibr cruise missile",
  "kind": "cruise",
  "hp": 55.0,
  "speed": 240.0,
  "reward": 5000
 },
 {
  "id": "oniks",
  "ru": "Противокорабельная ракета «Оникс»",
  "uk": "Протикорабельна ракета «Онікс»",
  "en": "P-800 Oniks anti-ship missile",
  "kind": "cruise",
  "hp": 55.0,
  "speed": 680.0,
  "reward": 8000
 },
 {
  "id": "kh31p",
  "ru": "Противорадарная ракета Х-31П",
  "uk": "Протирадіолокаційна ракета Х-31П",
  "en": "Kh-31P anti-radiation missile",
  "kind": "cruise",
  "hp": 40.0,
  "speed": 600.0,
  "reward": 6000
 },
 {
  "id": "banderol",
  "ru": "Ракета «Бандероль» S8000",
  "uk": "Ракета «Бандероль» S8000",
  "en": "S8000 Banderol missile",
  "kind": "cruise",
  "hp": 42.0,
  "speed": 165.0,
  "reward": 4200
 },
 {
  "id": "kab",
  "ru": "Управляемая авиабомба КАБ",
  "uk": "Керована авіабомба КАБ",
  "en": "KAB guided glide bomb",
  "kind": "cruise",
  "hp": 110.0,
  "speed": 240.0,
  "reward": 7000
 },
 {
  "id": "s300",
  "ru": "Ракета С-300 по земле",
  "uk": "Ракета С-300 по землі",
  "en": "S-300 fired at the ground",
  "kind": "ballistic",
  "hp": 60.0,
  "speed": 0.0,
  "reward": 8000
 },
 {
  "id": "kinzhal",
  "ru": "Аэробаллистическая «Кинжал»",
  "uk": "Аеробалістична «Кинджал»",
  "en": "Kinzhal aeroballistic missile",
  "kind": "ballistic",
  "hp": 100.0,
  "speed": 0.0,
  "reward": 16000
 },
 {
  "id": "kh22",
  "ru": "Ракета Х-22",
  "uk": "Ракета Х-22",
  "en": "Kh-22 missile",
  "kind": "ballistic",
  "hp": 95.0,
  "speed": 0.0,
  "reward": 13000
 },
 {
  "id": "oreshnik",
  "ru": "Боевой блок «Орешника»",
  "uk": "Бойовий блок «Орєшніка»",
  "en": "Oreshnik re-entry vehicle",
  "kind": "ballistic",
  "hp": 200.0,
  "speed": 0.0,
  "reward": 0
 },
 {
  "id": "zircon",
  "ru": "Гиперзвуковая ракета «Циркон»",
  "uk": "Гіперзвукова ракета «Циркон»",
  "en": "Zircon hypersonic missile",
  "kind": "ballistic",
  "hp": 95.0,
  "speed": 0.0,
  "reward": 18000
 },
 {
  "id": "s400",
  "ru": "Ракета С-400 по земле",
  "uk": "Ракета С-400 по землі",
  "en": "S-400 fired at the ground",
  "kind": "ballistic",
  "hp": 70.0,
  "speed": 0.0,
  "reward": 9500
 },
 {
  "id": "s500",
  "ru": "Ракета С-500 по земле",
  "uk": "Ракета С-500 по землі",
  "en": "S-500 fired at the ground",
  "kind": "ballistic",
  "hp": 110.0,
  "speed": 0.0,
  "reward": 15000
 }
];
