@charset "UTF-8";
:root {
  font-family: 'Segoe UI', 'Trebuchet MS', Arial, sans-serif;
  color: #16131d;
  background: #fff;
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  --purple: #7c2ee8;
  --pink: #c54ce5;
  --soft: #f7f5fb;
  --line: #e9e4ef;
  --red: #df1428;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; min-width: 320px; background: #fff; }
button, input { font: inherit; }
button { cursor: pointer; }
button, a { -webkit-tap-highlight-color: transparent; }
img { display: block; max-width: 100%; }

.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  color: #fff;
  background: linear-gradient(100deg, #7628e7 0%, #bc45e4 66%, #9e5bf2 100%);
  box-shadow: 0 2px 12px rgba(102, 36, 185, .18);
}

.header-inner {
  width: min(1220px, calc(100% - 28px));
  height: 88px;
  margin: auto;
  display: flex;
  align-items: center;
  gap: 14px;
}

.icon-button, .header-actions button, .search button {
  border: 0;
  color: inherit;
  background: transparent;
}

.menu-button { font-size: 19px; }
.logo { display: flex; align-items: center; gap: 9px; color: white; text-decoration: none; flex: 0 0 auto; }
.logo img { width: 66px; height: 66px; object-fit: contain; border-radius: 50%; }
.logo span { font-size: 25px; font-weight: 900; white-space: nowrap; }

.clock {
  width: 84px;
  min-height: 48px;
  padding: 7px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255,255,255,.55);
  border-radius: 13px;
  background: rgba(255,255,255,.16);
}
.clock b { font-size: 13px; }
.clock small { font-size: 9px; }

.search {
  min-width: 220px;
  height: 50px;
  flex: 1 1 520px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 13px;
  border: 1px solid rgba(255,255,255,.5);
  border-radius: 14px;
  background: rgba(255,255,255,.17);
}
.search input { width: 100%; border: 0; outline: 0; color: white; background: transparent; }
.search input::placeholder { color: rgba(255,255,255,.82); }
.search button { font-size: 21px; }

.header-actions { display: flex; align-items: center; gap: 14px; }
.header-actions button { min-width: 48px; display: grid; place-items: center; gap: 2px; position: relative; }
.header-actions span { font-size: 22px; line-height: 1; }
.header-actions b { font-size: 11px; white-space: nowrap; }
.basket-action i {
  position: absolute; top: -6px; right: 2px; min-width: 18px; height: 18px; padding: 0 4px;
  display: grid; place-items: center; border-radius: 9px; color: #7b2ee7; background: white;
  font-size: 10px; font-style: normal; font-weight: 800;
}

main { width: min(1000px, calc(100% - 30px)); margin: 0 auto; padding-bottom: 70px; }
.quick-links { display: flex; gap: 8px; padding: 16px 0 30px; }
.quick-links button {
  min-height: 30px; padding: 0 14px; border: 0; border-radius: 16px;
  color: #7133ac; background: #f4effa; font-size: 12px; font-weight: 700;
  transition: all 0.2s ease;
}
.quick-links button:hover { background: #e8d5ff; transform: translateY(-1px); }
.quick-links .seller { color: #087b54; background: #d9f8ea; }

.category-strip, .sub-categories {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: #999 transparent;
}
.category-strip {
  padding: 12px 14px 18px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: #fff;
}
.category, .sub-categories button {
  flex: 0 0 auto;
  min-height: 44px;
  border: 0;
  border-radius: 23px;
  background: #faf9fc;
  font-weight: 800;
  transition: all 0.2s ease;
}
.category { padding: 0 18px; }
.category span, .sub-categories span { margin-right: 9px; color: #7d35d8; }
.category.active { color: white; background: linear-gradient(100deg, #6424d9, #9e37e9); }
.category.active span { color: #ffd646; }

.sub-category-section, .products-section { margin-top: 20px; }
.section-title { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 12px; }
.section-title h2 { margin: 0; font-size: 20px; }
.section-title h2 small { color: #e0aa17; font-size: 10px; }
.section-title > button { border: 0; color: #6f2ec8; background: transparent; font-weight: 700; transition: all 0.2s ease; }
.section-title > button:hover { color: #9e37e9; }
.sub-categories { padding-bottom: 10px; }
.sub-categories button { min-width: 160px; padding: 0 16px; border: 1px solid var(--line); background: white; }

.campaign {
  position: relative;
  min-height: 370px;
  margin-top: 32px;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  border-radius: 24px;
  color: white;
  background: #18101e;
  box-shadow: 0 12px 36px rgba(72, 24, 95, .18);
}
.campaign::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(14,6,21,.92), rgba(50,19,68,.6) 45%, rgba(30,10,40,.08));
}
.campaign > img { width: 58%; margin-left: auto; object-fit: cover; object-position: center 40%; }
.campaign-copy { position: absolute; z-index: 2; left: 44px; top: 50%; transform: translateY(-50%); }
.campaign-copy p { margin: 0 0 8px; color: #eab9ff; font-weight: 800; }
.campaign-copy h1 { margin: 0; font-size: 38px; line-height: 1.08; letter-spacing: 0; }
.campaign-copy strong { color: #cf77ff; }
.campaign-copy button {
  min-height: 44px; margin-top: 24px; padding: 0 20px; border: 0; border-radius: 9px;
  color: #fff; background: linear-gradient(100deg, #7b2ee7, #d24bdd); font-weight: 800;
  transition: all 0.2s ease;
  cursor: pointer;
}
.campaign-copy button:hover { box-shadow: 0 8px 20px rgba(123, 46, 231, 0.3); }
.ad-label {
  position: absolute; z-index: 4; top: 12px; left: 12px; padding: 4px 9px;
  border-radius: 6px; color: #6f4c00; background: #ffc21c; font-size: 10px; font-weight: 900;
}
.slider-dots { position: absolute; z-index: 3; right: 18px; bottom: 15px; display: flex; gap: 6px; }
.slider-dots i { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,.45); }
.slider-dots i.active { width: 24px; border-radius: 8px; background: white; }

.product-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px; }
.product-card { min-width: 0; background: white; border-radius: 16px; transition: all 0.3s ease; }
.product-card:hover { box-shadow: 0 8px 24px rgba(102, 36, 185, 0.12); }
.product-image { position: relative; aspect-ratio: .86; overflow: hidden; border-radius: 16px; background: #f4f2f6; }
.product-image img { width: 100%; height: 100%; object-fit: cover; }
.heart {
  position: absolute; z-index: 3; top: 10px; right: 10px; width: 34px; height: 34px;
  border: 0; border-radius: 50%; color: #6f2ec8; background: rgba(255,255,255,.92); font-size: 21px;
  transition: all 0.2s ease;
  cursor: pointer;
}
.heart:hover { transform: scale(1.1); color: #d24bdd; }
.product-info { padding: 10px 5px 3px; }
.price-row { display: flex; align-items: baseline; gap: 8px; }
.price-row strong { color: var(--red); font-size: 20px; }
.price-row del { color: #777; font-size: 12px; }
.product-info h3 { height: 38px; margin: 7px 0; overflow: hidden; font-size: 14px; line-height: 1.35; }
.rating { color: #777; font-size: 12px; }
.rating span { color: #ffb400; }
.cart-button {
  width: 100%; min-height: 42px; margin-top: 13px; border: 0; border-radius: 10px;
  color: white; background: linear-gradient(100deg, #7628e7, #c845e6); font-weight: 800;
  transition: all 0.2s ease;
  cursor: pointer;
}
.cart-button:hover { box-shadow: 0 6px 18px rgba(198, 69, 230, 0.3); }

.gift-banner {
  min-height: 120px; margin: 36px 0; padding: 25px 30px; display: flex; align-items: center; gap: 22px;
  border-radius: 20px; color: white; background: linear-gradient(100deg, #ffae00, #ff6a22);
  box-shadow: 0 8px 24px rgba(255, 106, 34, 0.2);
}
.gift-banner > span { padding: 7px 11px; border-radius: 16px; background: rgba(255,255,255,.2); font-weight: 800; }
.gift-banner div { flex: 1; }
.gift-banner small { opacity: .9; }
.gift-banner h2 { margin: 4px 0 0; }
.gift-banner button { border: 0; color: white; background: transparent; font-weight: 900; transition: all 0.2s ease; cursor: pointer; }
.gift-banner button:hover { transform: translateX(3px); }

.benefits {
  margin-top: 46px; padding: 24px 0; display: grid; grid-template-columns: repeat(4,1fr);
  border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
}
.benefits div { display: grid; grid-template-columns: 42px 1fr; align-items: center; gap: 12px; }
.benefits span { grid-row: 1/3; font-size: 27px; }
.benefits small { color: #777; font-size: 12px; }
.mobile-nav { display: none; }
.toast {
  position: fixed; z-index: 100; left: 50%; bottom: 25px; transform: translate(-50%, 25px);
  padding: 13px 18px; border-radius: 9px; color: white; background: #20152a;
  opacity: 0; pointer-events: none; transition: .2s;
  max-width: 90%;
}
.toast.show { opacity: 1; transform: translate(-50%,0); }

.account-dialog, .panel-dialog {
  width: min(520px, calc(100% - 28px));
  max-height: calc(100vh - 40px);
  padding: 30px;
  overflow: auto;
  border: 0;
  border-radius: 16px;
  color: #20152a;
  box-shadow: 0 24px 80px rgba(35, 12, 53, .28);
}
.panel-dialog { width: min(760px, calc(100% - 28px)); }
.account-dialog::backdrop, .panel-dialog::backdrop { background: rgba(22, 10, 32, .58); backdrop-filter: blur(4px); }
.dialog-close {
  position: absolute; top: 12px; right: 14px; width: 36px; height: 36px;
  border: 0; border-radius: 50%; background: #f4effa; font-size: 22px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.dialog-close:hover { background: #e8d5ff; }
.dialog-kicker { color: #832fe7; font-size: 12px; font-weight: 900; text-transform: uppercase; }
.account-dialog h2, .panel-dialog h2 { margin: 8px 0 20px; }
.account-dialog form, .product-form { display: grid; gap: 14px; }
.account-dialog label, .product-form label { display: grid; gap: 6px; font-size: 13px; font-weight: 800; }
.account-dialog input, .product-form input {
  width: 100%; min-height: 46px; padding: 0 13px; border: 1px solid #ddd4e8; border-radius: 9px; outline: 0;
  transition: all 0.2s ease;
}
.account-dialog input:focus, .product-form input:focus { border-color: #8430e7; box-shadow: 0 0 0 3px rgba(132,48,231,.12); }
.form-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-submit, .form-secondary {
  min-height: 44px; padding: 0 16px; border-radius: 9px; font-weight: 900;
  transition: all 0.2s ease;
  cursor: pointer;
}
.form-submit { border: 0; color: white; background: linear-gradient(100deg, #7628e7, #c845e6); }
.form-submit:hover { box-shadow: 0 6px 18px rgba(198, 69, 230, 0.3); }
.form-secondary { border: 1px solid #d9cce8; color: #6721b9; background: white; }
.form-secondary:hover { background: #faf9fc; border-color: #8430e7; }
.form-message { min-height: 20px; margin: 0; color: #ba1530; font-size: 13px; }
.panel-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
.panel-stats div { padding: 18px; border-radius: 10px; background: #f5f1fa; }
.panel-stats b { display: block; font-size: 26px; }
.panel-stats span { color: #74677e; font-size: 12px; }
.management-list, .drawer-products { display: grid; gap: 10px; margin: 12px 0 24px; }
.management-list > div {
  min-height: 58px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  border: 1px solid #e4dcec; border-radius: 9px;
}
.management-list span { display: flex; align-items: center; gap: 7px; }
.management-list span:first-child { display: grid; }
.management-list small { color: #74677e; }
.management-list button, .drawer-product button {
  min-height: 34px; padding: 0 11px; border: 1px solid #d9cce8; border-radius: 7px; color: #6721b9; background: white; font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}
.management-list button:hover { background: #faf9fc; border-color: #8430e7; }
.management-list select { min-height: 38px; border: 1px solid #d9cce8; border-radius: 7px; background: white; }
.drawer-product {
  min-height: 76px; padding: 8px; display: grid; grid-template-columns: 62px 1fr auto; align-items: center; gap: 12px;
  border: 1px solid #e4dcec; border-radius: 10px;
}
.drawer-product img { width: 62px; height: 62px; object-fit: cover; border-radius: 8px; }
.drawer-product span { display: grid; gap: 5px; }
.drawer-product small { color: #d6132a; font-weight: 800; }
.cart-total { margin: 18px 0; padding: 15px; display: flex; justify-content: space-between; border-radius: 9px; background: #f5f1fa; font-size: 18px; }

@media (max-width: 900px) {
  .header-inner { height: auto; padding: 10px 0; flex-wrap: wrap; }
  .logo img { width: 52px; height: 52px; }
  .logo span { font-size: 20px; }
  .clock { display: none; }
  .search { order: 5; flex-basis: 100%; }
  .header-actions { margin-left: auto; }
  .header-actions button:not(.basket-action) { display: none; }
  .product-grid { grid-template-columns: repeat(3,minmax(0,1fr)); }
  .benefits { grid-template-columns: repeat(2,1fr); gap: 22px; }
}

@media (max-width: 620px) {
  main { width: min(100% - 20px,1000px); padding-bottom: 95px; }
  .site-header { position: relative; }
  .header-inner { width: calc(100% - 20px); }
  .menu-button { display: none; }
  .logo img { width: 46px; height: 46px; }
  .logo span { font-size: 19px; }
  .header-actions { display: none; }
  .quick-links { padding: 12px 0 18px; overflow-x: auto; }
  .category-strip { border-radius: 15px; }
  .campaign { min-height: 330px; border-radius: 17px; }
  .campaign > img { width: 100%; opacity: .52; }
  .campaign::after { background: linear-gradient(90deg, rgba(18,7,26,.92), rgba(30,10,40,.35)); }
  .campaign-copy { left: 24px; right: 18px; }
  .campaign-copy h1 { font-size: 30px; }
  .product-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
  .product-image { border-radius: 12px; }
  .price-row strong { font-size: 18px; }
  .gift-banner { align-items: flex-start; flex-direction: column; gap: 9px; padding: 20px; }
  .gift-banner button { padding: 0; }
  .benefits { grid-template-columns: 1fr; }
  .mobile-nav {
    position: fixed; z-index: 60; left: 0; right: 0; bottom: 0; height: 68px;
    display: grid; grid-template-columns: repeat(5,1fr); border-top: 1px solid var(--line);
    background: rgba(255,255,255,.97); box-shadow: 0 -8px 22px rgba(43,22,58,.08);
  }
  .mobile-nav button { position: relative; display: grid; place-items: center; gap: 2px; border: 0; color: #444; background: transparent; font-size: 10px; }
  .mobile-nav span { color: #792ee5; font-size: 20px; }
  .mobile-nav i { top: 4px; right: 20%; color: white; background: #7b2ee7; }
  .toast { bottom: 82px; white-space: nowrap; }
}
