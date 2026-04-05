import { useState, useRef } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────
const VEHICLE_ANGLES = [
  { id:"front", label:"Front",       icon:"⬆️", desc:"Straight-on front view" },
  { id:"back",  label:"Rear",        icon:"⬇️", desc:"Straight-on rear view" },
  { id:"left",  label:"Driver Side", icon:"⬅️", desc:"Full left side profile" },
  { id:"right", label:"Pass. Side",  icon:"➡️", desc:"Full right side profile" },
];
const WHEEL_SPOTS = [
  { id:"fl", label:"Front Left",  icon:"↖️" },
  { id:"fr", label:"Front Right", icon:"↗️" },
  { id:"rl", label:"Rear Left",   icon:"↙️" },
  { id:"rr", label:"Rear Right",  icon:"↘️" },
];

// Known car makes for spell-check validation
const KNOWN_MAKES = [
  "acura","alfa romeo","aston martin","audi","bentley","bmw","buick","cadillac",
  "chevrolet","chrysler","dodge","ferrari","fiat","ford","genesis","gmc","honda",
  "hyundai","infiniti","jaguar","jeep","kia","lamborghini","land rover","lexus",
  "lincoln","lotus","maserati","mazda","mclaren","mercedes","mercedes-benz",
  "mini","mitsubishi","nissan","pontiac","porsche","ram","rolls-royce","saturn",
  "scion","subaru","suzuki","tesla","toyota","volkswagen","volvo"
];

const FLUIDS = [
  {
    id:"engineOil", label:"Engine Oil", icon:"🛢️", type:"dipstick",
    // Base colors for swatches — but actual rendering uses OIL_PAINT below
    colors:["#f5f0c8","#d4960a","#7a3a08","#0e0704"],
    colorLabels:["New / Clear Light Yellow","Amber / Honey (good)","Dark Brown (aging)","Black / Sludge — change now"],
    intervals:[5000], critical:true,
    notes:"Check viscosity, level, color. Milky appearance = coolant contamination. Very light yellow = freshly changed. Darkening to black = needs change."
  },
];

// ── Photorealistic oil paint definitions per condition ─────────────────────────
// Each entry has: multiple gradient stops, specular color, opacity, rim color
const OIL_PAINT = [
  // 0 — New / Clear Light Yellow — thin, almost transparent, pale straw
  {
    stops:[
      {o:"0%",   c:"#f9f3c4", a:0.28},
      {o:"18%",  c:"#f0e68c", a:0.38},
      {o:"45%",  c:"#e8d84a", a:0.32},
      {o:"72%",  c:"#d4c520", a:0.42},
      {o:"100%", c:"#c8b800", a:0.48},
    ],
    specular:"#fffff0",
    specularOpacity: 0.55,
    rimLight:"#f5f0a0",
    meniscusColor:"#f0e870",
    meniscusOpacity: 0.50,
    dripOpacity: 0.35,
    shineOpacity: 0.45,
    label:"New / Clear Light Yellow",
  },
  // 1 — Amber / Honey — warm golden-brown, semi-transparent, rich color
  {
    stops:[
      {o:"0%",   c:"#c87d00", a:0.72},
      {o:"20%",  c:"#d4860a", a:0.82},
      {o:"40%",  c:"#b86800", a:0.88},
      {o:"60%",  c:"#9a5200", a:0.92},
      {o:"85%",  c:"#7a3e00", a:0.95},
      {o:"100%", c:"#5c2e00", a:0.98},
    ],
    specular:"#ffd966",
    specularOpacity: 0.50,
    rimLight:"#e8a020",
    meniscusColor:"#c8780a",
    meniscusOpacity: 0.80,
    dripOpacity: 0.75,
    shineOpacity: 0.30,
    label:"Amber / Honey (good)",
  },
  // 2 — Dark Brown — opaque, very dark, slight reddish undertone
  {
    stops:[
      {o:"0%",   c:"#5c2800", a:0.90},
      {o:"25%",  c:"#4a1e00", a:0.94},
      {o:"55%",  c:"#361400", a:0.97},
      {o:"80%",  c:"#280e00", a:0.98},
      {o:"100%", c:"#1a0800", a:1.00},
    ],
    specular:"#c86030",
    specularOpacity: 0.22,
    rimLight:"#8b3a10",
    meniscusColor:"#5c2800",
    meniscusOpacity: 0.92,
    dripOpacity: 0.88,
    shineOpacity: 0.14,
    label:"Dark Brown (aging)",
  },
  // 3 — Black / Sludge — fully opaque matte black, zero transparency
  {
    stops:[
      {o:"0%",   c:"#1a1008", a:0.97},
      {o:"30%",  c:"#120a04", a:0.99},
      {o:"70%",  c:"#0a0600", a:1.00},
      {o:"100%", c:"#050300", a:1.00},
    ],
    specular:"#4a3020",
    specularOpacity: 0.12,
    rimLight:"#2a1808",
    meniscusColor:"#1a1008",
    meniscusOpacity: 0.98,
    dripOpacity: 0.96,
    shineOpacity: 0.06,
    label:"Black / Sludge — change now",
  },
];

// ── Vehicle Oil Specs Database ─────────────────────────────────────────────────
// Maps make+model patterns to oil type, capacity, filter, and tools
const OIL_SPECS_DB = {
  // Toyota
  "toyota_camry":       { oil:"5W-30 Full Synthetic", capacity:"4.8 qt", filter:"Toyota 90915-YZZD4", drain:"14mm", tools:["14mm drain plug socket","Oil filter wrench","Drain pan (5+ qt)","Funnel","Torque wrench","Jack stands or ramps"] },
  "toyota_corolla":     { oil:"0W-20 Full Synthetic", capacity:"4.4 qt", filter:"Toyota 90915-YZZD4", drain:"14mm", tools:["14mm drain plug socket","Oil filter wrench","Drain pan","Funnel","Jack stands"] },
  "toyota_rav4":        { oil:"0W-20 Full Synthetic", capacity:"4.8 qt", filter:"Toyota 90915-YZZD4", drain:"14mm", tools:["14mm drain plug socket","Oil filter wrench","Drain pan (5+ qt)","Funnel","Jack stands"] },
  "toyota_tacoma":      { oil:"0W-20 Full Synthetic", capacity:"6.2 qt", filter:"Toyota 90915-YZZD4", drain:"14mm", tools:["14mm socket","Oil filter wrench","Drain pan (7+ qt)","Funnel","Torque wrench"] },
  "toyota_tundra":      { oil:"0W-20 Full Synthetic", capacity:"8.7 qt", filter:"Toyota 90915-YZZD4", drain:"14mm", tools:["14mm socket","Oil filter wrench","Drain pan (10+ qt)","Funnel","Torque wrench","Jack stands"] },
  "toyota_highlander":  { oil:"0W-20 Full Synthetic", capacity:"6.4 qt", filter:"Toyota 90915-YZZF1", drain:"14mm", tools:["14mm socket","Oil filter wrench","Drain pan (7+ qt)","Funnel"] },
  "toyota_4runner":     { oil:"5W-30 Full Synthetic", capacity:"5.5 qt", filter:"Toyota 90915-YZZD4", drain:"14mm", tools:["14mm socket","Oil filter wrench","Drain pan (6+ qt)","Funnel","Torque wrench"] },
  // Honda
  "honda_civic":        { oil:"0W-20 Full Synthetic", capacity:"3.7 qt", filter:"Honda 15400-PLM-A02", drain:"17mm", tools:["17mm drain plug socket","Honda oil filter wrench","Drain pan","Funnel","Jack stands"] },
  "honda_accord":       { oil:"0W-20 Full Synthetic", capacity:"3.7 qt", filter:"Honda 15400-PLM-A02", drain:"17mm", tools:["17mm socket","Oil filter wrench","Drain pan (4+ qt)","Funnel","Jack stands"] },
  "honda_cr-v":         { oil:"0W-20 Full Synthetic", capacity:"3.7 qt", filter:"Honda 15400-PLM-A02", drain:"17mm", tools:["17mm socket","Oil filter wrench","Drain pan","Funnel"] },
  "honda_pilot":        { oil:"5W-20 Full Synthetic", capacity:"4.5 qt", filter:"Honda 15400-PLM-A02", drain:"17mm", tools:["17mm socket","Oil filter wrench","Drain pan (5+ qt)","Funnel","Jack stands"] },
  "honda_odyssey":      { oil:"5W-20 Full Synthetic", capacity:"4.5 qt", filter:"Honda 15400-PLM-A02", drain:"17mm", tools:["17mm socket","Oil filter wrench","Drain pan (5+ qt)","Funnel"] },
  // Ford
  "ford_f-150":         { oil:"5W-30 Full Synthetic", capacity:"6.0 qt", filter:"Motorcraft FL-500S", drain:"16mm", tools:["16mm drain plug socket","Oil filter cap wrench","Drain pan (7+ qt)","Funnel","Torque wrench","Ramps or jack stands"] },
  "ford_mustang":       { oil:"5W-50 Full Synthetic", capacity:"8.0 qt", filter:"Motorcraft FL-500S", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (9+ qt)","Funnel","Jack stands"] },
  "ford_explorer":      { oil:"5W-30 Full Synthetic", capacity:"6.0 qt", filter:"Motorcraft FL-910S", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (7+ qt)","Funnel","Jack stands"] },
  "ford_escape":        { oil:"5W-20 Full Synthetic", capacity:"4.5 qt", filter:"Motorcraft FL-400S", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan","Funnel"] },
  "ford_ranger":        { oil:"5W-30 Full Synthetic", capacity:"5.0 qt", filter:"Motorcraft FL-500S", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (6+ qt)","Funnel","Ramps"] },
  // Chevrolet
  "chevrolet_silverado":{ oil:"0W-20 Full Synthetic (dexos1 Gen3)", capacity:"8.0 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm drain plug socket","Oil filter wrench","Drain pan (9+ qt)","Funnel","Torque wrench","Ramps"] },
  "chevrolet_equinox":  { oil:"0W-20 Full Synthetic (dexos1)", capacity:"5.0 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (6+ qt)","Funnel","Jack stands"] },
  "chevrolet_malibu":   { oil:"0W-20 Full Synthetic (dexos1)", capacity:"4.2 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan","Funnel"] },
  "chevrolet_tahoe":    { oil:"0W-20 Full Synthetic (dexos1 Gen3)", capacity:"8.0 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (9+ qt)","Funnel","Torque wrench","Ramps"] },
  "chevrolet_camaro":   { oil:"0W-20 Full Synthetic (dexos1)", capacity:"6.0 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (7+ qt)","Funnel","Jack stands"] },
  "chevrolet_colorado": { oil:"0W-20 Full Synthetic (dexos1)", capacity:"5.0 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (6+ qt)","Funnel","Ramps"] },
  "chevrolet_traverse": { oil:"0W-20 Full Synthetic (dexos1)", capacity:"5.3 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (6+ qt)","Funnel","Jack stands"] },
  "chevrolet_suburban": { oil:"0W-20 Full Synthetic (dexos1 Gen3)", capacity:"8.0 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (9+ qt)","Funnel","Torque wrench","Ramps"] },
  // GMC
  "gmc_sierra":         { oil:"0W-20 Full Synthetic (dexos1 Gen3)", capacity:"8.0 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (9+ qt)","Funnel","Torque wrench","Ramps"] },
  "gmc_yukon":          { oil:"0W-20 Full Synthetic (dexos1 Gen3)", capacity:"8.0 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (9+ qt)","Funnel","Ramps or jack stands"] },
  "gmc_terrain":        { oil:"0W-20 Full Synthetic (dexos1)", capacity:"5.0 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (6+ qt)","Funnel","Jack stands"] },
  "gmc_canyon":         { oil:"0W-20 Full Synthetic (dexos1)", capacity:"5.0 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (6+ qt)","Funnel","Ramps"] },
  "gmc_acadia":         { oil:"0W-20 Full Synthetic (dexos1)", capacity:"5.3 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (6+ qt)","Funnel","Jack stands"] },
  // Buick
  "buick_enclave":      { oil:"0W-20 Full Synthetic (dexos1)", capacity:"5.3 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (6+ qt)","Funnel","Jack stands"] },
  "buick_encore":       { oil:"0W-20 Full Synthetic (dexos1)", capacity:"4.2 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan","Funnel"] },
  // Cadillac
  "cadillac_escalade":  { oil:"0W-20 Full Synthetic (dexos1 Gen3)", capacity:"8.0 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (9+ qt)","Funnel","Torque wrench","Ramps"] },
  "cadillac_xt5":       { oil:"0W-20 Full Synthetic (dexos1)", capacity:"5.3 qt", filter:"AC Delco PF63E", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (6+ qt)","Funnel","Jack stands"] },
  // Nissan
  "nissan_altima":      { oil:"5W-30 Full Synthetic", capacity:"4.9 qt", filter:"Nissan 15208-9E01A", drain:"14mm", tools:["14mm drain plug socket","Oil filter wrench","Drain pan (5+ qt)","Funnel","Jack stands"] },
  "nissan_rogue":       { oil:"0W-20 Full Synthetic", capacity:"4.4 qt", filter:"Nissan 15208-9E01A", drain:"14mm", tools:["14mm socket","Oil filter wrench","Drain pan","Funnel"] },
  "nissan_frontier":    { oil:"5W-30 Full Synthetic", capacity:"5.1 qt", filter:"Nissan 15208-9E01A", drain:"14mm", tools:["14mm socket","Oil filter wrench","Drain pan (6+ qt)","Funnel","Ramps"] },
  "nissan_titan":       { oil:"5W-30 Full Synthetic", capacity:"6.9 qt", filter:"Nissan 15208-65F0E", drain:"14mm", tools:["14mm socket","Oil filter wrench","Drain pan (8+ qt)","Funnel","Torque wrench"] },
  // Jeep
  "jeep_wrangler":      { oil:"5W-20 Full Synthetic", capacity:"6.0 qt", filter:"Mopar 68191349AA", drain:"18mm", tools:["18mm drain plug socket","Oil filter cap wrench","Drain pan (7+ qt)","Funnel","Torque wrench","Jack stands"] },
  "jeep_grand cherokee":{ oil:"5W-20 Full Synthetic", capacity:"6.0 qt", filter:"Mopar 68191349AA", drain:"18mm", tools:["18mm socket","Oil filter wrench","Drain pan (7+ qt)","Funnel","Jack stands"] },
  "jeep_cherokee":      { oil:"5W-20 Full Synthetic", capacity:"5.5 qt", filter:"Mopar 68191349AA", drain:"18mm", tools:["18mm socket","Oil filter wrench","Drain pan (6+ qt)","Funnel"] },
  // BMW
  "bmw_3 series":       { oil:"5W-30 Full Synthetic (BMW LL-01)", capacity:"5.8 qt", filter:"Mann HU 816 x", drain:"17mm", tools:["17mm drain plug socket","BMW oil filter cap wrench 36mm","Drain pan (7+ qt)","Funnel","Torque wrench","Jack stands","BMW-spec oil only"] },
  "bmw_5 series":       { oil:"5W-30 Full Synthetic (BMW LL-01)", capacity:"6.9 qt", filter:"Mann HU 816 x", drain:"17mm", tools:["17mm socket","BMW oil filter cap wrench","Drain pan (8+ qt)","Funnel","Torque wrench"] },
  "bmw_x5":             { oil:"5W-30 Full Synthetic (BMW LL-01)", capacity:"6.9 qt", filter:"Mann HU 816 x", drain:"17mm", tools:["17mm socket","BMW filter cap wrench","Drain pan (8+ qt)","Funnel","Ramps","Torque wrench"] },
  // Mercedes
  "mercedes_c-class":   { oil:"5W-30 Full Synthetic (MB 229.5)", capacity:"6.9 qt", filter:"Mann W 67/1", drain:"13mm", tools:["13mm drain plug socket","Oil filter socket","Drain pan (8+ qt)","Funnel","Torque wrench","MB-approved oil required"] },
  "mercedes_e-class":   { oil:"5W-30 Full Synthetic (MB 229.5)", capacity:"7.4 qt", filter:"Mann W 67/1", drain:"13mm", tools:["13mm socket","Oil filter socket","Drain pan (9+ qt)","Funnel","Torque wrench"] },
  // Subaru
  "subaru_outback":     { oil:"0W-20 Full Synthetic", capacity:"5.1 qt", filter:"Subaru 15208AA15A", drain:"14mm", tools:["14mm socket","Oil filter wrench","Drain pan (6+ qt)","Funnel","Jack stands","Drain plug gasket (replace each time)"] },
  "subaru_forester":    { oil:"0W-20 Full Synthetic", capacity:"4.7 qt", filter:"Subaru 15208AA15A", drain:"14mm", tools:["14mm socket","Oil filter wrench","Drain pan","Funnel","Jack stands"] },
  "subaru_impreza":     { oil:"0W-20 Full Synthetic", capacity:"4.2 qt", filter:"Subaru 15208AA15A", drain:"14mm", tools:["14mm socket","Oil filter wrench","Drain pan","Funnel"] },
  // Dodge / Ram
  "ram_1500":           { oil:"5W-20 Full Synthetic", capacity:"7.0 qt", filter:"Mopar 68191349AA", drain:"15mm", tools:["15mm drain plug socket","Oil filter cap wrench","Drain pan (8+ qt)","Funnel","Torque wrench","Ramps"] },
  "dodge_charger":      { oil:"5W-20 Full Synthetic", capacity:"5.9 qt", filter:"Mopar 68191349AA", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (7+ qt)","Funnel","Jack stands"] },
  "dodge_challenger":   { oil:"5W-20 Full Synthetic", capacity:"5.9 qt", filter:"Mopar 68191349AA", drain:"15mm", tools:["15mm socket","Oil filter wrench","Drain pan (7+ qt)","Funnel","Jack stands"] },
  // Hyundai / Kia
  "hyundai_elantra":    { oil:"5W-20 Full Synthetic", capacity:"4.2 qt", filter:"Hyundai 26300-35504", drain:"14mm", tools:["14mm socket","Oil filter wrench","Drain pan","Funnel","Jack stands"] },
  "hyundai_tucson":     { oil:"5W-20 Full Synthetic", capacity:"4.8 qt", filter:"Hyundai 26300-35504", drain:"14mm", tools:["14mm socket","Oil filter wrench","Drain pan","Funnel"] },
  "kia_soul":           { oil:"5W-20 Full Synthetic", capacity:"3.6 qt", filter:"Kia 26300-35504", drain:"14mm", tools:["14mm socket","Oil filter wrench","Drain pan","Funnel"] },
  "kia_sportage":       { oil:"5W-20 Full Synthetic", capacity:"4.8 qt", filter:"Kia 26300-35504", drain:"14mm", tools:["14mm socket","Oil filter wrench","Drain pan","Funnel","Jack stands"] },
};

// GM brands — always require 15mm socket for drain plug
const GM_BRANDS = ["chevrolet","gmc","buick","cadillac","pontiac","saturn","oldsmobile"];

// Look up specs by make + model (fuzzy match)
function getOilSpecs(make, model) {
  if (!make || !model) return null;
  const makeLower  = make.toLowerCase();
  const key = `${makeLower}_${model.toLowerCase()}`;

  // Find matching spec entry
  let specs = OIL_SPECS_DB[key] || null;
  if (!specs) {
    const found = Object.entries(OIL_SPECS_DB).find(([k]) => {
      return key.startsWith(k) || k.startsWith(key) ||
        key.includes(k.split("_")[1]) && key.startsWith(k.split("_")[0]);
    });
    specs = found ? found[1] : null;
  }

  // For any GM brand — guarantee 15mm socket is in tools list
  if (GM_BRANDS.includes(makeLower)) {
    const base = specs || { oil:"5W-30 Full Synthetic", capacity:"See owner's manual", filter:"AC Delco (see manual)", drain:"15mm", tools:[] };
    const tools = base.tools || [];
    // Insert 15mm socket at the front if not already present
    const has15mm = tools.some(t => t.toLowerCase().includes("15mm"));
    return {
      ...base,
      tools: has15mm ? tools : ["15mm drain plug socket — required for all GM vehicles", ...tools],
    };
  }

  return specs;
}

// ── VehicleSpecs card — oil-relevant fields only ─────────────────────────────
function VehicleSpecsCard({ vinData, make, model }) {
  const specs = getOilSpecs(make, model);
  if (!vinData || vinData.error) return null;

  // Only pull fields that directly relate to engine oil inspection
  const cylinders   = vinData.EngineCylinders && vinData.EngineCylinders !== "0" ? vinData.EngineCylinders : null;
  const displacement = vinData.DisplacementL  && vinData.DisplacementL  !== "0" ? parseFloat(vinData.DisplacementL).toFixed(1) : null;
  const fuelType    = vinData.FuelTypePrimary || null;
  // Diesel engines need different oil — flag it
  const isDiesel    = fuelType?.toLowerCase().includes("diesel");
  const isHybrid    = fuelType?.toLowerCase().includes("hybrid") || fuelType?.toLowerCase().includes("electric");

  return (
    <div style={{ background:"linear-gradient(135deg,#0a1628,#0f2040)", border:"1.5px solid #1d4ed8", borderRadius:16, padding:20, marginTop:14 }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <span style={{ fontSize:20 }}>🔎</span>
        <div>
          <div style={{ fontWeight:800, fontSize:14, color:"#bfdbfe" }}>VIN Decoded — Oil Inspection Specs</div>
          <div style={{ fontSize:10, color:"#3b82f6" }}>{vinData.ModelYear} {vinData.Make} {vinData.Model}</div>
        </div>
      </div>

      {/* Engine facts relevant to oil */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:"8px 14px", marginBottom:14 }}>
        {cylinders && (
          <div style={{ background:"#1e3a5f", borderRadius:8, padding:"8px 10px" }}>
            <div style={{ fontSize:9, color:"#93c5fd", textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:700 }}>Engine</div>
            <div style={{ fontSize:15, fontWeight:800, color:"#dbeafe" }}>{cylinders}-Cylinder</div>
            {displacement && <div style={{ fontSize:10, color:"#93c5fd" }}>{displacement}L</div>}
          </div>
        )}
        {fuelType && (
          <div style={{ background: isDiesel?"#1a1a0a": isHybrid?"#0a1a14":"#1e3a5f", borderRadius:8, padding:"8px 10px", border: isDiesel?"1px solid #854d0e": isHybrid?"1px solid #065f46":"none" }}>
            <div style={{ fontSize:9, color: isDiesel?"#fbbf24": isHybrid?"#34d399":"#93c5fd", textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:700 }}>Fuel Type</div>
            <div style={{ fontSize:13, fontWeight:700, color: isDiesel?"#fef08a": isHybrid?"#a7f3d0":"#dbeafe" }}>{fuelType}</div>
            {isDiesel && <div style={{ fontSize:9, color:"#f59e0b", marginTop:2 }}>⚠️ Use diesel-rated oil</div>}
            {isHybrid && <div style={{ fontSize:9, color:"#34d399", marginTop:2 }}>⚡ Use OEM-spec hybrid oil</div>}
          </div>
        )}
      </div>

      {/* Oil Specs — the core section */}
      {specs ? (
        <div style={{ background:"#0a2040", borderRadius:10, padding:"12px 14px", border:"1px solid #1d4ed8" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#60a5fa", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>
            🛢️ Recommended Oil Specs
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 16px" }}>
            <div>
              <div style={{ fontSize:9, color:"#64748b", fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>Oil Type</div>
              <div style={{ fontSize:13, fontWeight:800, color:"#fef08a" }}>{specs.oil}</div>
            </div>
            <div>
              <div style={{ fontSize:9, color:"#64748b", fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>Oil Capacity</div>
              <div style={{ fontSize:13, fontWeight:800, color:"#bbf7d0" }}>{specs.capacity}</div>
            </div>
            <div>
              <div style={{ fontSize:9, color:"#64748b", fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>Drain Plug Socket</div>
              <div style={{ fontSize:13, fontWeight:800, color:"#e0f2fe" }}>{specs.drain}</div>
            </div>
            <div>
              <div style={{ fontSize:9, color:"#64748b", fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>Oil Filter</div>
              <div style={{ fontSize:12, fontWeight:700, color:"#fecdd3" }}>{specs.filter}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
const isValidName    = v => v.trim().length >= 2 && /^[a-zA-Z\s'\-]+$/.test(v.trim());
const isValidPhone   = v => /^[\d\s\-\(\)\+]{7,15}$/.test(v.trim());
const isValidEmail   = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidAddress = v => v.trim().length >= 5;
const isValidYear    = v => /^\d{4}$/.test(v) && parseInt(v) >= 1980 && parseInt(v) <= new Date().getFullYear() + 1;
const isValidMiles   = v => /^\d+$/.test(v.trim()) && parseInt(v) > 0;
const isValidVin     = v => v.trim().length === 17;
const isValidText    = v => v.trim().length >= 2 && /^[a-zA-Z0-9\s\-]+$/.test(v.trim());

// Make validation: must be a known car brand (handles common misspellings)
const isValidMake = v => {
  if (v.trim().length < 2) return false;
  const lower = v.trim().toLowerCase();
  // Exact match
  if (KNOWN_MAKES.includes(lower)) return true;
  // Check for close match (within 2 char edit distance for typos)
  return KNOWN_MAKES.some(make => {
    if (Math.abs(make.length - lower.length) > 3) return false;
    // Simple contains check for partial matches
    if (make.startsWith(lower.slice(0,4)) && lower.length >= 4) return true;
    // Levenshtein-lite: count matching chars
    let matches = 0;
    for (let i = 0; i < Math.min(lower.length, make.length); i++) {
      if (lower[i] === make[i]) matches++;
    }
    return matches / make.length > 0.8;
  });
};

// Model: just needs to be text, no numbers-only
const isValidModel = v => v.trim().length >= 1 && /^[a-zA-Z0-9\s\-]+$/.test(v.trim()) && !/^\d+$/.test(v.trim());

function getMakeHint(v) {
  if (!v.trim() || v.trim().length < 2) return null;
  const lower = v.trim().toLowerCase();
  if (KNOWN_MAKES.includes(lower)) return null;
  // Find closest match to suggest
  const close = KNOWN_MAKES.find(make => {
    const minLen = Math.min(make.length, lower.length);
    let matches = 0;
    for (let i = 0; i < minLen; i++) if (lower[i] === make[i]) matches++;
    return matches >= 4 && matches / make.length > 0.6;
  });
  if (close) return `Did you mean "${close.charAt(0).toUpperCase() + close.slice(1)}"?`;
  return "Unknown make — check spelling";
}

function mileRec(fluid, miles) {
  if (!fluid.intervals[0] || !miles) return null;
  const m = parseInt(miles); if (isNaN(m)) return null;
  const iv = fluid.intervals[0], rem = iv - (m % iv);
  if (rem < iv * 0.1) return { status:"overdue", msg:"Overdue — service needed now" };
  if (rem < iv * 0.25) return { status:"soon",   msg:`Due soon (~${rem.toLocaleString()} mi)` };
  return { status:"ok", msg:`On track (~${rem.toLocaleString()} mi left)` };
}

// ─── FieldBox ─────────────────────────────────────────────────────────────────
function FieldBox({ label, value, onChange, placeholder, validate, hint, type="text", required=true }) {
  const [touched, setTouched] = useState(false);
  const valid  = required ? (validate ? validate(value) : value.trim().length > 0) : true;
  const filled = value.trim().length > 0;
  const showR  = touched && !valid;
  const showG  = touched && valid && filled;
  const hintMsg = hint && touched && !valid && filled ? hint(value) : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, fontWeight:700, letterSpacing:"0.09em", color:"#94a3b8", textTransform:"uppercase" }}>
        {label}{required && <span style={{ color:"#f87171" }}> *</span>}
      </label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        style={{
          background: showR ? "#fef2f2" : showG ? "#f0fdf4" : "#1e293b",
          border: `2px solid ${showR ? "#ef4444" : showG ? "#22c55e" : "#334155"}`,
          borderRadius: 8, padding: "9px 11px",
          color: showR ? "#991b1b" : showG ? "#166534" : "#f1f5f9",
          fontSize: 13, outline:"none", transition:"all 0.2s", width:"100%", boxSizing:"border-box",
        }}
      />
      {showR && (
        <span style={{ fontSize:10, color:"#f87171" }}>
          {hintMsg || (!filled ? `${label} is required` : `Invalid ${label.toLowerCase()}`)}
        </span>
      )}
      {showG && (
        <span style={{ fontSize:10, color:"#22c55e" }}>✓ Looks good</span>
      )}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, color="#22c55e", size="md" }) {
  const w = size==="sm" ? 36 : 44, h = size==="sm" ? 20 : 24, th = size==="sm" ? 14 : 18;
  return (
    <button onClick={() => onChange(!checked)}
      style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", padding:0 }}>
      <div style={{ width:w, height:h, borderRadius:h/2, background:checked?color:"#334155", position:"relative", transition:"background 0.3s", flexShrink:0 }}>
        <div style={{ width:th, height:th, borderRadius:"50%", background:"#fff", position:"absolute", top:(h-th)/2, left:checked?w-th-(h-th)/2:(h-th)/2, transition:"left 0.3s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }}/>
      </div>
      <span style={{ fontSize:size==="sm"?11:13, color:checked?color:"#64748b", fontWeight:600, transition:"color 0.3s" }}>{label}</span>
    </button>
  );
}

// ─── Photo Tile ───────────────────────────────────────────────────────────────
function PhotoTile({ label, icon, desc, photo, onCapture, required=true, compact=false }) {
  const inputRef = useRef();
  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onCapture(ev.target.result);
    reader.readAsDataURL(file);
  };
  const h = compact ? 150 : 180;
  return (
    <div onClick={() => inputRef.current.click()} style={{
      cursor:"pointer", borderRadius:12,
      border:`2px solid ${photo ? "#22c55e" : "#334155"}`,
      background: photo ? "#052e16" : "#1e293b",
      position:"relative", height:h,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      overflow:"hidden", transition:"all 0.2s", flexShrink:0,
    }}>
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        onChange={handleFile} style={{ display:"none" }}/>
      {photo ? (
        <>
          <img src={photo} alt={label} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,#000c 0%,transparent 55%)" }}>
            <div style={{ position:"absolute", bottom:8, left:8, right:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, fontWeight:700, color:"#bbf7d0" }}>✓ {label}</span>
              <span style={{ fontSize:9, color:"#86efac", background:"#14532d99", padding:"2px 6px", borderRadius:99 }}>retake</span>
            </div>
          </div>
        </>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, padding:"12px 8px", width:"100%", boxSizing:"border-box" }}>
          <div style={{ width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, lineHeight:1, flexShrink:0 }}>
            {icon}
          </div>
          <span style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", textAlign:"center", lineHeight:1.2 }}>{label}</span>
          {!compact && <span style={{ fontSize:9, color:"#64748b", textAlign:"center", lineHeight:1.3, maxWidth:120 }}>{desc}</span>}
          <div style={{ background:"#334155", borderRadius:6, padding:"3px 10px", fontSize:10, color:"#94a3b8", marginTop:2 }}>
            📷 Tap to capture
          </div>
          {required && <div style={{ position:"absolute", top:8, right:8, width:8, height:8, borderRadius:"50%", background:"#f87171" }}/>}
        </div>
      )}
    </div>
  );
}

// ─── Before / After Photo Pair ────────────────────────────────────────────────
function BeforeAfterPair({ label, icon, desc, before, after, onBefore, onAfter }) {
  const beforeRef = useRef();
  const afterRef  = useRef();

  const openPicker = (ref, onCapture) => {
    const input = ref.current;
    input.value = "";
    const handler = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => onCapture(ev.target.result);
      reader.readAsDataURL(file);
      input.removeEventListener("change", handler);
    };
    input.addEventListener("change", handler);
    input.click();
  };

  const Slot = ({ photo, slotLabel, color, onCapture, inputRef }) => (
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.09em", color, marginBottom:5, textAlign:"center" }}>
        {slotLabel}
      </div>
      <div
        onClick={() => openPicker(inputRef, onCapture)}
        style={{
          cursor:"pointer", borderRadius:10,
          border:`2px solid ${photo ? color : "#334155"}`,
          background:"#0f172a",
          height:130, position:"relative", overflow:"hidden",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          transition:"all 0.2s",
        }}
      >
        {photo ? (
          <>
            <img src={photo} alt={slotLabel} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
            <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"16px 8px 6px", background:"linear-gradient(transparent,#000d)", textAlign:"center" }}>
              <span style={{ fontSize:9, color, fontWeight:800 }}>✓ tap to retake</span>
            </div>
          </>
        ) : (
          <div style={{ textAlign:"center", padding:8 }}>
            <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
            <div style={{ fontSize:10, color:"#94a3b8", fontWeight:600 }}>📷 {slotLabel}</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{
      background:"#1e293b", borderRadius:12, padding:"14px 16px",
      border:`1.5px solid ${before&&after?"#22c55e":"#334155"}`, transition:"border 0.3s",
    }}>
      <input ref={beforeRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }}/>
      <input ref={afterRef}  type="file" accept="image/*" capture="environment" style={{ display:"none" }}/>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <span style={{ fontSize:16 }}>{icon}</span>
        <div>
          <div style={{ fontWeight:700, fontSize:13, color:"#f1f5f9" }}>{label}</div>
          {desc && <div style={{ fontSize:10, color:"#64748b" }}>{desc}</div>}
        </div>
        {before && after && <span style={{ marginLeft:"auto", fontSize:10, color:"#22c55e", fontWeight:700 }}>✓ Complete</span>}
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"stretch" }}>
        <Slot photo={before} slotLabel="BEFORE" color="#f97316" onCapture={onBefore} inputRef={beforeRef}/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"#475569", flexShrink:0 }}>→</div>
        <Slot photo={after}  slotLabel="AFTER"  color="#22c55e" onCapture={onAfter}  inputRef={afterRef}/>
      </div>
    </div>
  );
}

// ─── REALISTIC Dipstick Gauge ─────────────────────────────────────────────────
function DipstickGauge({ label, colors, colorLabels, level, colorIdx, onLevelChange, onColorChange }) {
  const fillColor = colors[colorIdx] || colors[0];

  // Canvas dimensions
  const SVG_W = 220, SVG_H = 400;
  const cx = 80; // center X of stick

  // Stick geometry — thin, tapered like a real dipstick
  const stickW = 14;       // narrow metal rod
  const stickTop = 68;     // below handle/neck
  const stickBot = 310;    // before tip
  const stickH = stickBot - stickTop;

  // Measurement zone — between F (full/upper) and L (low/lower)
  const fMarkY = stickTop + Math.round(stickH * 0.30);
  const lMarkY = stickTop + Math.round(stickH * 0.60);
  const hatchTop = fMarkY;
  const hatchBot = lMarkY;
  const hatchH = hatchBot - hatchTop;

  // Oil fill — rises from bottom tip upward
  const fillTopY = stickBot - Math.round((level / 100) * stickH);

  // Status
  const statusLabel = level < 30 ? "ADD OIL" : level < 44 ? "LOW" : level <= 72 ? "O.K." : "TOO FULL";
  const statusColor = level < 30 ? "#ef4444" : level < 44 ? "#f97316" : level <= 72 ? "#22c55e" : "#eab308";

  // Sheen highlight x positions on stick
  const shineX = cx - stickW/2 + 2;

  // Photorealistic oil paint for this condition
  const paint = OIL_PAINT[colorIdx] || OIL_PAINT[1];
  const gradId = `oilReal-${colorIdx}`;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, width:"100%" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"center", gap:6, width:"100%" }}>

        {/* ── REALISTIC DIPSTICK SVG ── */}
        <svg width={SVG_W} height={SVG_H} style={{ overflow:"visible", flexShrink:0 }}>
          <defs>
            {/* Metal gradient for stick body — gives 3D round rod look */}
            <linearGradient id="metalGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%"   stopColor="#2d3748"/>
              <stop offset="15%"  stopColor="#718096"/>
              <stop offset="35%"  stopColor="#e2e8f0"/>
              <stop offset="50%"  stopColor="#f7fafc"/>
              <stop offset="65%"  stopColor="#cbd5e0"/>
              <stop offset="85%"  stopColor="#4a5568"/>
              <stop offset="100%" stopColor="#1a202c"/>
            </linearGradient>
            {/* Handle gradient — yellow/orange loop like real dipsticks */}
            <linearGradient id="handleGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%"   stopColor="#92400e"/>
              <stop offset="20%"  stopColor="#f59e0b"/>
              <stop offset="50%"  stopColor="#fef08a"/>
              <stop offset="80%"  stopColor="#f59e0b"/>
              <stop offset="100%" stopColor="#78350f"/>
            </linearGradient>
            {/* Neck gradient */}
            <linearGradient id="neckGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%"   stopColor="#1a202c"/>
              <stop offset="40%"  stopColor="#718096"/>
              <stop offset="60%"  stopColor="#a0aec0"/>
              <stop offset="100%" stopColor="#2d3748"/>
            </linearGradient>
            {/* Hatch zone overlay — etched/darker area */}
            <linearGradient id="hatchBg" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%"   stopColor="#000" stopOpacity="0.5"/>
              <stop offset="30%"  stopColor="#000" stopOpacity="0.15"/>
              <stop offset="70%"  stopColor="#000" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#000" stopOpacity="0.5"/>
            </linearGradient>

            {/* ── PHOTOREALISTIC OIL GRADIENT (vertical, top=lighter, bottom=darker) ── */}
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              {paint.stops.map((s,i) => (
                <stop key={i} offset={s.o} stopColor={s.c} stopOpacity={s.a}/>
              ))}
            </linearGradient>

            {/* Specular highlight gradient — left-side bright streak */}
            <linearGradient id={`oilSpec-${colorIdx}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%"   stopColor={paint.specular} stopOpacity={paint.specularOpacity}/>
              <stop offset="40%"  stopColor={paint.specular} stopOpacity={paint.specularOpacity * 0.6}/>
              <stop offset="100%" stopColor={paint.specular} stopOpacity="0"/>
            </linearGradient>

            {/* Rim light gradient — right edge warm glow */}
            <linearGradient id={`oilRim-${colorIdx}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%"   stopColor={paint.rimLight} stopOpacity="0"/>
              <stop offset="70%"  stopColor={paint.rimLight} stopOpacity="0.15"/>
              <stop offset="100%" stopColor={paint.rimLight} stopOpacity="0.35"/>
            </linearGradient>

            {/* Clip to stick body */}
            <clipPath id="stickClip">
              <rect x={cx-stickW/2} y={stickTop} width={stickW} height={stickH+30} rx={2}/>
            </clipPath>
            {/* Clip to hatch zone only */}
            <clipPath id="hatchClip">
              <rect x={cx-stickW/2} y={hatchTop} width={stickW} height={hatchH}/>
            </clipPath>
            {/* Clip to tip triangle */}
            <clipPath id="tipClip">
              <polygon points={`${cx-stickW/2},${stickBot} ${cx+stickW/2},${stickBot} ${cx},${stickBot+28}`}/>
            </clipPath>
            {/* Clip to oil fill area only */}
            <clipPath id={`oilClip-${colorIdx}`}>
              <rect x={cx-stickW/2} y={fillTopY} width={stickW} height={stickBot-fillTopY+28}/>
            </clipPath>
          </defs>

          {/* ══ HANDLE — yellow pull-loop like real engine dipstick ══ */}
          <ellipse cx={cx} cy={26} rx={22} ry={16} fill="#78350f" opacity={0.5}/>
          <ellipse cx={cx} cy={24} rx={21} ry={15} fill="url(#handleGrad)" stroke="#92400e" strokeWidth={1.5}/>
          <ellipse cx={cx} cy={24} rx={13} ry={8} fill="#0f172a"/>
          <ellipse cx={cx-4} cy={20} rx={5} ry={3} fill="#fef9c3" opacity={0.5}/>
          <text x={cx} y={27} textAnchor="middle" fill="#92400e" fontSize={6} fontWeight="800" letterSpacing="0.05em">OIL</text>

          {/* ══ NECK ══ */}
          <path d={`M ${cx-8} 36 L ${cx-stickW/2} ${stickTop} L ${cx+stickW/2} ${stickTop} L ${cx+8} 36 Z`}
            fill="url(#neckGrad)" stroke="#4a5568" strokeWidth={0.8}/>
          <path d={`M ${cx-2} 36 L ${cx-stickW/2+1} ${stickTop}`}
            stroke="#a0aec0" strokeWidth={1} opacity={0.6}/>

          {/* ══ STICK BODY — metal rod ══ */}
          <rect x={cx-stickW/2} y={stickTop} width={stickW} height={stickH}
            fill="url(#metalGrad)" rx={2}/>

          {/* ══ PHOTOREALISTIC OIL FILL ══ */}
          {/* Layer 1: Base oil body */}
          <rect x={cx-stickW/2+1} y={fillTopY}
            width={stickW-2} height={Math.max(0, stickBot-fillTopY)}
            fill={`url(#${gradId})`}
            clipPath="url(#stickClip)"
            style={{transition:"y 0.4s ease, height 0.4s ease"}}/>

          {/* Layer 2: Specular highlight — left side bright streak (oil is glossy) */}
          <rect x={cx-stickW/2+1} y={fillTopY}
            width={stickW-2} height={Math.max(0, stickBot-fillTopY)}
            fill={`url(#oilSpec-${colorIdx})`}
            clipPath="url(#stickClip)"
            style={{transition:"y 0.4s ease, height 0.4s ease"}}/>

          {/* Layer 3: Rim light — right edge subtle warm bounce */}
          <rect x={cx-stickW/2+1} y={fillTopY}
            width={stickW-2} height={Math.max(0, stickBot-fillTopY)}
            fill={`url(#oilRim-${colorIdx})`}
            clipPath="url(#stickClip)"
            style={{transition:"y 0.4s ease, height 0.4s ease"}}/>

          {/* Layer 4: Thin bright center shine line running through oil */}
          <rect x={cx-1} y={fillTopY+4}
            width={2} height={Math.max(0, stickBot-fillTopY-12)}
            fill={paint.specular} opacity={paint.shineOpacity * 0.4}
            clipPath="url(#stickClip)"
            style={{transition:"y 0.4s ease, height 0.4s ease"}}/>

          {/* ══ OIL SURFACE MENISCUS — curved lip where oil meets air ══ */}
          {/* Outer meniscus — darker curved shadow */}
          <ellipse cx={cx} cy={fillTopY} rx={stickW/2-0.5} ry={4}
            fill={paint.meniscusColor} opacity={paint.meniscusOpacity * 0.6}
            style={{transition:"cy 0.4s ease"}}/>
          {/* Inner meniscus — bright highlight on curved surface */}
          <ellipse cx={cx} cy={fillTopY-1} rx={stickW/2-2} ry={2.5}
            fill={paint.specular} opacity={paint.specularOpacity * 0.8}
            style={{transition:"cy 0.4s ease"}}/>
          {/* Tiny bright center spot on meniscus */}
          <ellipse cx={cx-1} cy={fillTopY-1} rx={2} ry={1}
            fill="#ffffff" opacity={paint.shineOpacity * 0.6}
            style={{transition:"cy 0.4s ease"}}/>

          {/* ══ OIL ON TIP ══ */}
          <polygon
            points={`${cx-stickW/2},${stickBot} ${cx+stickW/2},${stickBot} ${cx},${stickBot+28}`}
            fill={`url(#${gradId})`}/>
          {/* Tip specular */}
          <polygon
            points={`${cx-stickW/2},${stickBot} ${cx+stickW/2},${stickBot} ${cx},${stickBot+28}`}
            fill={`url(#oilSpec-${colorIdx})`}/>
          {/* Oil drip at very tip — teardrop shape */}
          <ellipse cx={cx} cy={stickBot+30} rx={3.5} ry={5}
            fill={paint.meniscusColor} opacity={paint.dripOpacity}/>
          {/* Drip highlight */}
          <ellipse cx={cx-1} cy={stickBot+28} rx={1.2} ry={1.8}
            fill={paint.specular} opacity={paint.specularOpacity * 0.6}/>

          {/* ══ HATCH ZONE — etched measurement area ══ */}
          <rect x={cx-stickW/2} y={hatchTop} width={stickW} height={hatchH}
            fill="url(#hatchBg)" clipPath="url(#stickClip)"/>
          <g clipPath="url(#hatchClip)">
            {Array.from({length:20}).map((_,i)=>{
              const sp=9, sy = hatchTop - stickW + i*sp;
              return [
                <line key={`ha${i}`} x1={cx-stickW/2} y1={sy} x2={cx+stickW/2} y2={sy+stickW}
                  stroke="#fff" strokeWidth={0.7} opacity={0.45}/>,
                <line key={`hb${i}`} x1={cx+stickW/2} y1={sy} x2={cx-stickW/2} y2={sy+stickW}
                  stroke="#fff" strokeWidth={0.7} opacity={0.45}/>,
              ];
            })}
          </g>
          <line x1={cx-stickW/2-1} y1={hatchTop} x2={cx+stickW/2+1} y2={hatchTop}
            stroke="#e2e8f0" strokeWidth={1.5}/>
          <line x1={cx-stickW/2-1} y1={hatchBot} x2={cx+stickW/2+1} y2={hatchBot}
            stroke="#e2e8f0" strokeWidth={1.5}/>

          {/* ══ METAL SHEEN — polished rod highlight on top of oil ══ */}
          <rect x={cx-stickW/2} y={stickTop} width={3} height={stickH}
            fill="#fff" opacity={0.12} rx={1} clipPath="url(#stickClip)"/>

          {/* ══ F MARK — FULL (upper) ══ */}
          <line x1={cx-stickW/2-10} y1={fMarkY} x2={cx+stickW/2+10} y2={fMarkY}
            stroke="#22c55e" strokeWidth={2}/>
          {/* Notch cut into stick at F */}
          <rect x={cx-stickW/2-2} y={fMarkY-1} width={stickW+4} height={2} fill="#22c55e" opacity={0.8}/>
          <text x={cx+stickW/2+16} y={fMarkY+4} fill="#22c55e" fontSize={13} fontWeight="900">F</text>
          <text x={cx+stickW/2+30} y={fMarkY+4} fill="#64748b" fontSize={8}>Full</text>

          {/* ══ L MARK — LOW (lower) ══ */}
          <line x1={cx-stickW/2-10} y1={lMarkY} x2={cx+stickW/2+10} y2={lMarkY}
            stroke="#f87171" strokeWidth={2}/>
          <rect x={cx-stickW/2-2} y={lMarkY-1} width={stickW+4} height={2} fill="#f87171" opacity={0.8}/>
          <text x={cx+stickW/2+16} y={lMarkY+4} fill="#f87171" fontSize={13} fontWeight="900">L</text>
          <text x={cx+stickW/2+30} y={lMarkY+4} fill="#64748b" fontSize={8}>Low</text>

          {/* Mid tick marks between L and F */}
          {[0.25,0.5,0.75].map((t,i)=>{
            const y = hatchTop + hatchH*t;
            return <line key={i} x1={cx-stickW/2-5} y1={y} x2={cx+stickW/2+5} y2={y}
              stroke="#94a3b8" strokeWidth={0.8} strokeDasharray="2 1"/>;
          })}

          {/* ══ ARROW INDICATOR — points down to oil surface ══ */}
          <g style={{transition:"transform 0.4s ease"}} transform={`translate(0, ${fillTopY - 68})`}>
            {/* Shaft */}
            <line x1={cx-stickW/2-24} y1={52} x2={cx-stickW/2-24} y2={66}
              stroke={statusColor} strokeWidth={2.5} strokeLinecap="round"/>
            {/* Arrowhead ▼ */}
            <polygon
              points={`${cx-stickW/2-30},64 ${cx-stickW/2-18},64 ${cx-stickW/2-24},72`}
              fill={statusColor}/>
            {/* Percentage label */}
            <text x={cx-stickW/2-24} y={48} textAnchor="middle"
              fill={statusColor} fontSize={10} fontWeight="800">{level}%</text>
          </g>

          {/* ══ STATUS BADGE at bottom ══ */}
          <rect x={cx-38} y={SVG_H-26} width={76} height={20} rx={10}
            fill={`${statusColor}20`} stroke={statusColor} strokeWidth={1.5}/>
          <text x={cx} y={SVG_H-12} textAnchor="middle" fill={statusColor} fontSize={11} fontWeight="800">
            {statusLabel}
          </text>
        </svg>

        {/* ── Vertical slider ── */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, paddingTop:stickTop+10 }}>
          <span style={{ fontSize:9, color:"#64748b", fontWeight:700 }}>FULL</span>
          <input type="range" min={0} max={100} value={level}
            onChange={e => onLevelChange(parseInt(e.target.value))}
            style={{ writingMode:"vertical-lr", direction:"rtl", width:22, height:stickH-20, cursor:"pointer", accentColor:fillColor }}/>
          <span style={{ fontSize:9, color:"#64748b", fontWeight:700 }}>LOW</span>
        </div>
      </div>

      {/* ── Oil Color selector — realistic swatches ── */}
      <div style={{ width:"100%", maxWidth:320 }}>
        <div style={{ fontSize:10, color:"#64748b", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>Oil Color / Condition</div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {OIL_PAINT.map((p, i) => {
            const isSelected = colorIdx === i;
            // Build a small CSS gradient for the swatch
            const swatchGrad = p.stops.map(s => `${s.c}`);
            const bg = i === 0
              ? `linear-gradient(135deg, #f9f5d0 0%, #ede8a0 40%, #d8cc60 100%)`
              : i === 1
              ? `linear-gradient(135deg, #d4960a 0%, #b87008 35%, #7a4400 70%, #4a2800 100%)`
              : i === 2
              ? `linear-gradient(135deg, #5c2800 0%, #3a1600 40%, #200a00 100%)`
              : `linear-gradient(135deg, #1a1008 0%, #0e0806 50%, #050302 100%)`;
            return (
              <button key={i} onClick={() => onColorChange(i)} title={p.label}
                style={{
                  width:36, height:36, borderRadius:"50%",
                  border:`3px solid ${isSelected ? "#f1f5f9" : "#334155"}`,
                  background: bg,
                  cursor:"pointer", transition:"all 0.2s", flexShrink:0,
                  boxShadow: isSelected
                    ? `0 0 0 3px ${i===0?"#d4c520":i===1?"#b87008":i===2?"#5c2800":"#1a1008"}55, inset 0 1px 3px rgba(255,255,255,0.3)`
                    : "inset 0 1px 2px rgba(255,255,255,0.15)",
                  outline: i===0 ? "1px dashed #94a3b8" : "none",
                }}/>
            );
          })}
        </div>
        <div style={{
          fontSize:11, color:"#94a3b8", marginTop:7, fontWeight:600,
          padding:"5px 10px", background:"#0f172a", borderRadius:6, display:"inline-block"
        }}>
          {OIL_PAINT[colorIdx]?.label}
        </div>
      </div>
    </div>
  );
}



// ── Oil Inspection Checks data ────────────────────────────────────────────────
const OIL_CHECKS = [
  {
    id: "smell",
    label: "Oil Smell",
    icon: "👃",
    description: "Pull dipstick and smell the oil",
    options: [
      { value:"normal",   label:"Normal / No odor",        color:"#22c55e", hint:"Fresh or slightly used oil with no odor — normal" },
      { value:"burnt",    label:"Burnt / Sharp smell",      color:"#f97316", hint:"Burnt smell = oil overheated or engine running hot" },
      { value:"fuel",     label:"Gasoline smell",           color:"#ef4444", hint:"Gas in oil = fuel injector leak or short trips. Change oil immediately." },
      { value:"sweet",    label:"Sweet / Coolant smell",    color:"#ef4444", hint:"Sweet smell = coolant contamination. Head gasket may be blown." },
      { value:"sulfur",   label:"Sulfur / Rotten egg",      color:"#dc2626", hint:"Sulfur smell = catalytic converter or fuel mixture issue." },
    ],
  },
  {
    id: "viscosity",
    label: "Viscosity / Thickness",
    icon: "💧",
    description: "Rub oil between fingers to test thickness",
    options: [
      { value:"normal",   label:"Normal — smooth & slippery", color:"#22c55e", hint:"Good viscosity for the oil weight specified" },
      { value:"thin",     label:"Thin / Watery",              color:"#eab308", hint:"Too thin = oil diluted by fuel or water. Investigate and change." },
      { value:"thick",    label:"Thick / Sluggish",           color:"#f97316", hint:"Overly thick = sludge buildup or wrong oil weight." },
      { value:"gritty",   label:"Gritty / Sandy texture",     color:"#ef4444", hint:"Grit = metal particles or dirt contamination. Change oil now." },
      { value:"foamy",    label:"Foamy / Bubbly",             color:"#dc2626", hint:"Foamy = coolant mixed with oil. Serious — stop driving." },
    ],
  },
  {
    id: "color",
    label: "Oil Color (Visual)",
    icon: "🎨",
    description: "Hold dipstick up to light for color check",
    options: [
      { value:"clear_yellow", label:"Clear / Light yellow",   color:"#fef08a", hint:"Just changed — brand new oil" },
      { value:"amber",        label:"Amber / Golden",         color:"#f59e0b", hint:"Good — oil doing its job, normal use" },
      { value:"brown",        label:"Dark brown",             color:"#92400e", hint:"Aging oil — monitor, change soon" },
      { value:"black",        label:"Black / Opaque",         color:"#475569", hint:"Overdue for change. Carbon and soot buildup." },
      { value:"milky",        label:"Milky / Creamy",         color:"#e2e8f0", hint:"Coolant contamination — head gasket issue. Do not drive." },
    ],
  },
  {
    id: "contaminants",
    label: "Contaminants Check",
    icon: "🔬",
    description: "Inspect dipstick for particles or residue",
    options: [
      { value:"clean",    label:"Clean — no particles",       color:"#22c55e", hint:"No visible contamination detected" },
      { value:"metal",    label:"Metal flakes/shavings",      color:"#ef4444", hint:"Metal particles = engine wear. Immediate inspection needed." },
      { value:"sludge",   label:"Sludge / Tar-like deposits", color:"#b45309", hint:"Sludge buildup = neglected oil changes. Flush and change." },
      { value:"water",    label:"Water droplets",             color:"#f97316", hint:"Water = condensation or head gasket leak." },
      { value:"dirt",     label:"Dirt / Debris",              color:"#d97706", hint:"Dirt = air filter failure or crankcase breather issue." },
    ],
  },
  {
    id: "leaks",
    label: "External Leak Check",
    icon: "🔍",
    description: "Inspect engine exterior and ground beneath",
    options: [
      { value:"none",     label:"No leaks detected",          color:"#22c55e", hint:"No visible leaks on engine or ground" },
      { value:"seeping",  label:"Slight seep / Wet spots",    color:"#eab308", hint:"Minor seeping — monitor at next service" },
      { value:"dripping", label:"Active drip",                color:"#f97316", hint:"Active drip — locate and seal source before next drive" },
      { value:"major",    label:"Major leak / Pooling",       color:"#ef4444", hint:"Major leak — do not drive. Tow to shop immediately." },
    ],
  },
  {
    id: "oilPressure",
    label: "Oil Pressure Warning Light",
    icon: "⚠️",
    description: "Check if oil pressure warning light has appeared",
    options: [
      { value:"off",      label:"Light OFF — normal",         color:"#22c55e", hint:"No oil pressure warning — system operating normally" },
      { value:"flicker",  label:"Flickered briefly",          color:"#eab308", hint:"Occasional flicker = low level or failing sensor" },
      { value:"on",       label:"Light ON while driving",     color:"#ef4444", hint:"Constant light = low pressure. Stop engine immediately." },
    ],
  },
  {
    id: "consumption",
    label: "Oil Consumption",
    icon: "📉",
    description: "Ask customer how often they add oil between changes",
    options: [
      { value:"none",     label:"No top-off needed",          color:"#22c55e", hint:"Normal consumption — no oil added between changes" },
      { value:"minor",    label:"Add ~1 qt per 3,000 mi",    color:"#eab308", hint:"Slightly elevated — monitor but acceptable for older engines" },
      { value:"moderate", label:"Add 1 qt per 1,000 mi",     color:"#f97316", hint:"High consumption — check valve seals and piston rings" },
      { value:"severe",   label:"Add 1+ qt per 500 mi",      color:"#ef4444", hint:"Severe consumption — major engine wear or leak present" },
    ],
  },
];

// ── OilCheckRow component ──────────────────────────────────────────────────────
function OilCheckRow({ check, selected, onSelect }) {
  return (
    <div style={{ background:"#0f172a", borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <span style={{ fontSize:16, lineHeight:1 }}>{check.icon}</span>
        <div>
          <div style={{ fontWeight:700, fontSize:13, color:"#f1f5f9" }}>{check.label}</div>
          <div style={{ fontSize:10, color:"#64748b", marginTop:1 }}>{check.description}</div>
        </div>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {check.options.map(opt => {
          const isSelected = selected === opt.value;
          return (
            <button key={opt.value} onClick={() => onSelect(opt.value)}
              style={{
                padding:"5px 11px", borderRadius:8, fontSize:11, fontWeight:700,
                cursor:"pointer", transition:"all 0.2s",
                background: isSelected ? `${opt.color}22` : "#1e293b",
                border: `1.5px solid ${isSelected ? opt.color : "#334155"}`,
                color: isSelected ? opt.color : "#64748b",
              }}>
              {opt.label}
            </button>
          );
        })}
      </div>
      {selected && (() => {
        const opt = check.options.find(o => o.value === selected);
        return opt ? (
          <div style={{
            marginTop:8, fontSize:10, color: opt.color,
            background:`${opt.color}12`, borderRadius:6, padding:"5px 10px",
            lineHeight:1.4, fontWeight:500,
          }}>
            💡 {opt.hint}
          </div>
        ) : null;
      })()}
    </div>
  );
}

// ─── Auto-detection logic based on oil color + level ─────────────────────────
function getAutoDetection(colorIdx, level) {
  // colorIdx: 0=New/Clear, 1=Amber/Good, 2=Dark Brown, 3=Black/Sludge
  // Returns { status, urgency, message, recommendation }

  // Black / Sludge — always Service Now regardless of level
  if (colorIdx === 3) return {
    status:    "Service Now",
    urgency:   "critical",
    message:   "⛔ Oil is BLACK — severely degraded, carbon & soot buildup detected",
    recommendation: "Immediate oil & filter change required. Do not delay — black oil causes accelerated engine wear.",
    color:     "#ef4444",
    bg:        "#1c0505",
    border:    "#ef4444",
  };

  // Dark Brown + low level — Service Now
  if (colorIdx === 2 && level < 30) return {
    status:    "Service Now",
    urgency:   "critical",
    message:   "⛔ Oil is DARK BROWN and critically LOW",
    recommendation: "Oil change + filter change required immediately. Top off with correct oil grade to prevent engine damage.",
    color:     "#ef4444",
    bg:        "#1c0505",
    border:    "#ef4444",
  };

  // Dark Brown — Monitor / change soon
  if (colorIdx === 2) return {
    status:    "Monitor",
    urgency:   "warning",
    message:   "⚠️ Oil is DARK BROWN — aging, approaching end of service life",
    recommendation: "Schedule oil & filter change soon. Monitor level and color at each fill-up.",
    color:     "#eab308",
    bg:        "#1c1400",
    border:    "#854d0e",
  };

  // Critically low level regardless of color
  if (level < 20) return {
    status:    "Service Now",
    urgency:   "critical",
    message:   "⛔ Oil level is CRITICALLY LOW",
    recommendation: "Top off immediately with correct oil grade. Inspect for leaks. Low oil = risk of engine seizure.",
    color:     "#ef4444",
    bg:        "#1c0505",
    border:    "#ef4444",
  };

  // Low level — amber or better color
  if (level < 35) return {
    status:    "Monitor",
    urgency:   "warning",
    message:   "⚠️ Oil level is LOW",
    recommendation: "Add oil to bring level between L and F marks. Check for leaks if level drops repeatedly.",
    color:     "#f97316",
    bg:        "#1c0d00",
    border:    "#7c3209",
  };

  // Amber + good level = Pass
  if (colorIdx === 1 && level >= 35) return {
    status:    "Pass",
    urgency:   "ok",
    message:   "✅ Oil is AMBER — good condition and adequate level",
    recommendation: "Oil is in good working condition. Continue monitoring per service interval.",
    color:     "#22c55e",
    bg:        "#031a0e",
    border:    "#166534",
  };

  // New / clear yellow + good level = Pass
  if (colorIdx === 0 && level >= 35) return {
    status:    "Pass",
    urgency:   "ok",
    message:   "✅ Oil is NEW / freshly changed — excellent condition",
    recommendation: "Oil recently changed. No action needed. Schedule next change per manufacturer interval.",
    color:     "#22c55e",
    bg:        "#031a0e",
    border:    "#166534",
  };

  return null;
}

// ─── Fluid Card ───────────────────────────────────────────────────────────────
const GAUGE_BOX_H = 400;

function FluidCard({ fluid, miles, state, onUpdate, photoUploaded }) {
  const rec = mileRec(fluid, miles);
  const recColor = rec?.status==="overdue" ? "#ef4444" : rec?.status==="soon" ? "#eab308" : "#22c55e";

  // Auto-detect based on color and level
  const autoDetect = getAutoDetection(state.colorIdx, state.level);

  // Auto-apply status whenever color or level changes (unless already manually overridden in this session)
  const autoStatus = autoDetect?.status || state.status;

  return (
    <div style={{
      background: state.alreadyDone ? "linear-gradient(135deg,#0f2a1a,#1a3a2a)" : "#1e293b",
      border: `1.5px solid ${state.alreadyDone ? "#16a34a" : autoStatus==="Service Now" ? "#ef4444" : autoStatus==="Monitor" ? "#eab308" : "#334155"}`,
      borderRadius:14, padding:"16px 18px", transition:"all 0.3s",
      display:"flex", flexDirection:"column",
    }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:20, lineHeight:1, flexShrink:0 }}>{fluid.icon}</span>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:"#f1f5f9", lineHeight:1.2 }}>{fluid.label}</div>
            {fluid.critical && <span style={{ fontSize:9, background:"#7c3aed22", color:"#a78bfa", padding:"1px 6px", borderRadius:99, fontWeight:700 }}>CRITICAL</span>}
          </div>
        </div>
        <Toggle checked={state.toggled} onChange={v=>onUpdate({toggled:v})} label={state.toggled?"On":"Skip"} color="#3b82f6" size="sm"/>
      </div>

      {state.toggled && (
        <>
          {/* Already serviced toggle */}
          <div style={{ marginBottom:10 }}>
            <Toggle checked={state.alreadyDone} onChange={v=>onUpdate({alreadyDone:v})}
              label={state.alreadyDone ? "✅ Already serviced — On Track" : "Mark as already serviced"} color="#22c55e" size="sm"/>
          </div>

          {!state.alreadyDone && (
            <>
              {/* Mile rec */}
              {rec && (
                <div style={{ background:`${recColor}18`, border:`1px solid ${recColor}40`, borderRadius:8, padding:"5px 10px", marginBottom:10, fontSize:11, color:recColor, fontWeight:600 }}>
                  🔧 {rec.msg}
                </div>
              )}

              {/* ── GAUGE BOX ── */}
              <div style={{
                background:"#0f172a", borderRadius:10, padding:"16px 12px", marginBottom:12,
                minHeight:GAUGE_BOX_H, display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <DipstickGauge
                  label={fluid.label} colors={fluid.colors} colorLabels={fluid.colorLabels}
                  level={state.level} colorIdx={state.colorIdx}
                  onLevelChange={v=>onUpdate({level:v})} onColorChange={v=>onUpdate({colorIdx:v})}/>
              </div>

              {/* ── AUTO-DETECTION BANNER ── */}
              {autoDetect && (
                <div style={{
                  background: autoDetect.bg,
                  border: `2px solid ${autoDetect.border}`,
                  borderRadius:10, padding:"12px 14px", marginBottom:12,
                }}>
                  <div style={{ fontSize:13, fontWeight:800, color:autoDetect.color, marginBottom:5 }}>
                    {autoDetect.message}
                  </div>
                  <div style={{ fontSize:11, color:"#94a3b8", lineHeight:1.5 }}>
                    🔧 {autoDetect.recommendation}
                  </div>
                  <div style={{ fontSize:9, color:"#475569", marginTop:5, fontStyle:"italic" }}>
                    Auto-detected based on oil color &amp; level — tap below to override
                  </div>
                </div>
              )}

              {/* Status buttons — auto pre-selected, tech can override */}
              <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:10 }}>
                {["Pass","Monitor","Service Now"].map(s => {
                  const isActive = (state.status || autoStatus) === s;
                  return (
                    <button key={s} onClick={() => onUpdate({status:s})} style={{
                      flex:1, minWidth:80, padding:"6px 8px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.2s",
                      background: isActive ? s==="Pass"?"#166534":s==="Monitor"?"#854d0e":"#7f1d1d" : "#0f172a",
                      border: `1.5px solid ${isActive ? s==="Pass"?"#22c55e":s==="Monitor"?"#eab308":"#ef4444" : "#334155"}`,
                      color: isActive ? s==="Pass"?"#bbf7d0":s==="Monitor"?"#fef08a":"#fecaca" : "#64748b",
                    }}>{s==="Pass"?"✅":s==="Monitor"?"⚠️":"🚨"} {s}</button>
                  );
                })}
              </div>
              <div style={{ fontSize:10, color:"#475569", marginBottom:14, lineHeight:1.5 }}>💡 {fluid.notes}</div>

              {/* ── OIL INSPECTION CHECKS ── */}
              <div style={{ borderTop:"1px solid #334155", paddingTop:14, marginBottom:4 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:12 }}>
                  🔬 Detailed Oil Inspection Checks
                </div>
                {OIL_CHECKS.map(check => (
                  <OilCheckRow
                    key={check.id}
                    check={check}
                    selected={state.oilChecks?.[check.id] || ""}
                    onSelect={val => onUpdate({ oilChecks: { ...state.oilChecks, [check.id]: val } })}
                  />
                ))}
              </div>
            </>
          )}

          <textarea value={state.note} onChange={e => onUpdate({note:e.target.value})}
            placeholder="Tech notes (optional)..."
            style={{ width:"100%", boxSizing:"border-box", background:"#0f172a", border:"1.5px solid #334155", borderRadius:8, padding:"7px 10px", color:"#94a3b8", fontSize:11, resize:"vertical", minHeight:48, outline:"none", marginTop:"auto" }}/>
        </>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ step, title, complete }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
      <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, background:complete?"#166534":"#1e293b", border:`2px solid ${complete?"#22c55e":"#334155"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:complete?"#bbf7d0":"#64748b" }}>
        {complete ? "✓" : step}
      </div>
      <div>
        <div style={{ fontWeight:800, fontSize:15, color:"#f1f5f9" }}>{title}</div>
        <div style={{ fontSize:11, color:complete?"#22c55e":"#64748b" }}>{complete ? "Complete ✓" : "Required to proceed"}</div>
      </div>
    </div>
  );
}

// ─── Print Modal ──────────────────────────────────────────────────────────────
function PrintModal({ info, miles, fluidStates, onClose }) {
  const date = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const rows = FLUIDS.filter(f => fluidStates[f.id]?.toggled).map(f => {
    const s = fluidStates[f.id];
    // Build oil checks summary
    const checks = OIL_CHECKS.map(c => {
      const val = s.oilChecks?.[c.id];
      if (!val) return null;
      const opt = c.options.find(o => o.value === val);
      return opt ? { label: c.label, icon: c.icon, selected: opt.label, color: opt.color, hint: opt.hint } : null;
    }).filter(Boolean);
    return {
      fluid:f.label, icon:f.icon,
      status: s.alreadyDone ? "Already Serviced" : s.status || "—",
      condition: f.colorLabels[s.colorIdx||0], level: s.level+"%",
      note: s.note, alreadyDone: s.alreadyDone,
      rec: mileRec(f, miles)?.msg || "—",
      checks,
    };
  });

  const handlePrint = () => {
    const win = window.open("","_blank");

    // Build before/after photo HTML helper
    const baPhotos = info._baPhotos || {};
    const baSection = (title, pairs) => {
      const hasAny = pairs.some(([,bk,ak]) => baPhotos[bk] || baPhotos[ak]);
      if (!hasAny) return "";
      return `<div class="section">
  <div class="section-title">${title}</div>
  <div class="ba-grid">
    ${pairs.map(([label, bk, ak]) => {
      const b = baPhotos[bk], a = baPhotos[ak];
      if (!b && !a) return "";
      return `<div class="ba-pair">
        <div class="ba-label">${label}</div>
        <div class="ba-row">
          <div class="ba-slot">
            <div class="ba-slot-label before-label">BEFORE</div>
            ${b ? `<img src="${b}" class="ba-img"/>` : `<div class="ba-empty">No photo</div>`}
          </div>
          <div class="ba-arrow">→</div>
          <div class="ba-slot">
            <div class="ba-slot-label after-label">AFTER</div>
            ${a ? `<img src="${a}" class="ba-img"/>` : `<div class="ba-empty">No photo</div>`}
          </div>
        </div>
      </div>`;
    }).join("")}
  </div>
</div>`;
    };

    const wheelPhotoHTML = Object.entries(info._wheelPhotos||{}).map(([id,src])=>{
      const wheel = WHEEL_SPOTS.find(w=>w.id===id);
      return `<div class="photo-cell">
        <img src="${src}" alt="${wheel?.label||id}"/>
        <div class="photo-label">${wheel?.icon||""} ${wheel?.label||id}</div>
      </div>`;
    }).join("");

    const fluidPhotoHTML = Object.entries(info._fluidPhotos||{}).map(([id,src])=>{
      const fluid = FLUIDS.find(f=>f.id===id);
      return `<div class="photo-cell">
        <img src="${src}" alt="${fluid?.label||id}"/>
        <div class="photo-label">${fluid?.icon||""} ${fluid?.label||id}</div>
      </div>`;
    }).join("");

    // Overall status color
    const statusColorMap = {"Pass":"#16a34a","Monitor":"#ca8a04","Service Now":"#dc2626","Already Serviced":"#2563eb"};

    win.document.write(`<!DOCTYPE html><html><head>
<title>Engine Oil Inspection — ${info.year} ${info.make} ${info.model}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#0f172a;padding:0}
  /* PAGE HEADER */
  .page-header{background:#0f172a;color:#fff;padding:24px 32px;display:flex;justify-content:space-between;align-items:center}
  .page-header h1{font-size:22px;font-weight:800;letter-spacing:-0.02em}
  .page-header .badge{background:#f59e0b;color:#0f172a;padding:4px 14px;border-radius:99px;font-size:11px;font-weight:800;letter-spacing:0.06em}
  .page-header .meta{font-size:11px;color:#94a3b8;margin-top:4px}
  /* SECTIONS */
  .section{padding:20px 32px;border-bottom:1px solid #e2e8f0}
  .section-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:12px;display:flex;align-items:center;gap:6px}
  /* INFO GRID */
  .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px 24px}
  .kv{}
  .kv label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:700;display:block;margin-bottom:2px}
  .kv span{font-size:13px;font-weight:600;color:#0f172a}
  /* STATUS BADGE */
  .status-badge{display:inline-block;padding:5px 16px;border-radius:99px;font-size:13px;font-weight:800;letter-spacing:0.04em}
  /* OIL SUMMARY BOX */
  .oil-summary{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-bottom:0}
  .oil-summary-row{display:flex;gap:32px;align-items:flex-start;flex-wrap:wrap}
  .oil-stat{text-align:center;min-width:80px}
  .oil-stat .val{font-size:28px;font-weight:900;line-height:1}
  .oil-stat .lbl{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;font-weight:700;margin-top:3px}
  /* DIPSTICK VISUAL */
  .dipstick-bar{width:100%;max-width:400px;height:32px;background:#e2e8f0;border-radius:16px;overflow:hidden;position:relative;margin:6px 0}
  .dipstick-fill{height:100%;border-radius:16px;transition:width .3s;position:relative}
  .dipstick-markers{position:relative;width:100%;max-width:400px;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8;font-weight:700;margin-top:2px}
  /* CHECKS TABLE */
  .checks-wrap{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px}
  .check-card{border-radius:8px;padding:11px 13px;border-left:4px solid #e2e8f0;background:#f8fafc}
  .check-card .cc-icon-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:4px}
  .check-card .cc-val{font-size:13px;font-weight:800;margin-bottom:3px}
  .check-card .cc-hint{font-size:10px;color:#475569;line-height:1.4}
  .check-card.urgent{background:#fef2f2}
  .check-card.warning{background:#fffbeb}
  /* PHOTOS */
  .photo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .photo-cell img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;display:block}
  .photo-cell .photo-label{font-size:9px;color:#64748b;text-align:center;margin-top:4px;font-weight:700}
  /* BEFORE / AFTER */
  .ba-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
  .ba-pair{background:#f8fafc;border-radius:10px;padding:12px}
  .ba-label{font-size:10px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}
  .ba-row{display:flex;align-items:center;gap:8px}
  .ba-slot{flex:1;min-width:0}
  .ba-slot-label{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;text-align:center;margin-bottom:3px}
  .before-label{color:#f97316}
  .after-label{color:#16a34a}
  .ba-img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;display:block}
  .ba-empty{width:100%;aspect-ratio:4/3;background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8}
  .ba-arrow{font-size:16px;color:#94a3b8;flex-shrink:0}
  /* TECH NOTES */
  .notes-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;font-size:12px;color:#334155;line-height:1.6;min-height:48px}
  /* SIGNATURE */
  .sig-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:8px}
  .sig-line{border-bottom:1px solid #334155;height:36px;margin-bottom:4px}
  .sig-label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:700}
  /* FOOTER */
  .page-footer{background:#f8fafc;padding:14px 32px;display:flex;justify-content:space-between;align-items:center;border-top:2px solid #e2e8f0;font-size:10px;color:#94a3b8}
  /* DIVIDER */
  .divider{height:1px;background:#e2e8f0;margin:0}
  /* RECOMMENDATION BOX */
  .rec-box{border-radius:8px;padding:10px 14px;font-size:11px;font-weight:600;margin-top:10px}
  @media print{body{padding:0}.section{page-break-inside:avoid}}
</style>
</head><body>

<!-- PAGE HEADER -->
<div class="page-header">
  <div>
    <h1>🛢️ Engine Oil Inspection Report</h1>
    <div class="meta">Date: ${date} &nbsp;·&nbsp; Mileage: ${parseInt(miles).toLocaleString()} mi &nbsp;·&nbsp; Technician: ${info.techName}</div>
  </div>
  <div class="badge">OFFICIAL RECORD</div>
</div>

<!-- CUSTOMER & VEHICLE INFO -->
<div class="section">
  <div class="section-title">👤 Customer &amp; Vehicle Information</div>
  <div class="info-grid">
    <div class="kv"><label>Customer Name</label><span>${info.custName}</span></div>
    <div class="kv"><label>Phone</label><span>${info.custPhone}</span></div>
    <div class="kv"><label>Email</label><span>${info.custEmail}</span></div>
    <div class="kv" style="grid-column:1/-1"><label>Address</label><span>${info.custAddress}</span></div>
    <div class="kv"><label>Year / Make / Model</label><span>${info.year} ${info.make} ${info.model}</span></div>
    <div class="kv"><label>VIN</label><span style="font-family:monospace;letter-spacing:.08em">${info.vin}</span></div>
    <div class="kv"><label>Mileage at Inspection</label><span>${parseInt(miles).toLocaleString()} mi</span></div>
  </div>
</div>

<!-- OIL LEVEL & OVERALL STATUS -->
${rows.map(r => {
  const lvl = parseInt(r.level);
  const fillColor = r.alreadyDone?"#2563eb":r.status==="Pass"?"#16a34a":r.status==="Monitor"?"#ca8a04":"#dc2626";
  const statusLabel = r.alreadyDone?"Already Serviced":r.status||"Not Set";
  const recStyle = r.rec.includes("Overdue")?"background:#fef2f2;border:1px solid #fecaca;color:#dc2626":r.rec.includes("soon")?"background:#fffbeb;border:1px solid #fde68a;color:#92400e":"background:#f0fdf4;border:1px solid #bbf7d0;color:#166534";
  return `
<div class="section">
  <div class="section-title">🛢️ Oil Level &amp; Condition Summary</div>
  <div class="oil-summary">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:16px">
      <div>
        <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Current Oil Level</div>
        <div style="font-size:36px;font-weight:900;color:${lvl<30?"#dc2626":lvl<50?"#f97316":"#16a34a"};line-height:1">${r.level}</div>
        <div style="font-size:10px;color:#64748b;margin-top:3px">${lvl<30?"⚠️ CRITICALLY LOW":lvl<50?"⚠️ LOW — Add Oil":lvl<=80?"✅ Good Range":"⚠️ Overfilled"}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Overall Status</div>
        <span class="status-badge" style="background:${fillColor}22;color:${fillColor};border:2px solid ${fillColor}">${statusLabel}</span>
      </div>
      <div>
        <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Oil Color / Condition</div>
        <div style="font-size:14px;font-weight:700;color:#0f172a">${r.condition}</div>
      </div>
    </div>
    <!-- Dipstick Level Bar -->
    <div style="font-size:10px;color:#64748b;font-weight:700;margin-bottom:4px">DIPSTICK LEVEL INDICATOR</div>
    <div class="dipstick-bar">
      <div class="dipstick-fill" style="width:${lvl}%;background:${lvl<30?"#ef4444":lvl<50?"#f97316":lvl<=80?"#22c55e":"#eab308"}"></div>
      <div style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5)">${r.level}</div>
    </div>
    <div class="dipstick-markers"><span>ADD OIL</span><span>LOW</span><span style="color:#22c55e;font-weight:800">✓ O.K.</span><span>FULL</span><span>TOO FULL</span></div>
    ${r.rec !== "—" ? `<div class="rec-box" style="${recStyle}">🔧 Mile-Based Recommendation: ${r.rec}</div>` : ""}
    ${r.note ? `<div style="margin-top:10px;padding:10px 12px;background:#f1f5f9;border-radius:6px;font-size:11px;color:#334155"><strong>Tech Note:</strong> ${r.note}</div>` : ""}
  </div>
</div>`;
}).join("")}

<!-- DETAILED INSPECTION CHECKS -->
${rows.map(r => r.checks.length > 0 ? `
<div class="section">
  <div class="section-title">🔬 Detailed Oil Inspection Checks</div>
  <div class="checks-wrap">
    ${r.checks.map(c => {
      const isUrgent = c.color==="#ef4444"||c.color==="#dc2626";
      const isWarn   = c.color==="#f97316"||c.color==="#eab308";
      return `<div class="check-card ${isUrgent?"urgent":isWarn?"warning":""}" style="border-left-color:${c.color}">
        <div class="cc-icon-label">${c.icon} ${c.label}</div>
        <div class="cc-val" style="color:${c.color}">${c.selected}</div>
        <div class="cc-hint">${c.hint}</div>
      </div>`;
    }).join("")}
  </div>
  ${r.checks.some(c=>c.color==="#ef4444"||c.color==="#dc2626") ? `
  <div style="margin-top:14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;font-size:11px;color:#991b1b;font-weight:600">
    ⚠️ <strong>URGENT ACTION REQUIRED:</strong> One or more checks indicate a critical condition. Do not operate vehicle until inspected by a qualified technician.
  </div>` : ""}
</div>` : "").join("")}

<!-- 360° VEHICLE PHOTOS -->
${baSection("⬆️⬇️⬅️➡️ 360° Vehicle Inspection — Before &amp; After", [
  ["Front View",      "exterior_front_before",  "exterior_front_after"],
  ["Rear View",       "exterior_rear_before",   "exterior_rear_after"],
  ["Driver Side",     "exterior_left_before",   "exterior_left_after"],
  ["Passenger Side",  "exterior_right_before",  "exterior_right_after"],
])}
${baSection("🔵 Wheel &amp; Tire — Before &amp; After", [
  ["Front Left Wheel",  "wheel_fl_before", "wheel_fl_after"],
  ["Front Right Wheel", "wheel_fr_before", "wheel_fr_after"],
  ["Rear Left Wheel",   "wheel_rl_before", "wheel_rl_after"],
  ["Rear Right Wheel",  "wheel_rr_before", "wheel_rr_after"],
])}
${baSection("🛢️ Oil Dipstick &amp; Dashboard — Before &amp; After", [
  ["Oil Dipstick",        "dipstick_before",  "dipstick_after"],
  ["Dashboard / Cluster", "dashboard_before", "dashboard_after"],
])}
${baSection("🔩 Oil Filter &amp; Drain Plug — Before &amp; After", [
  ["Oil Filter",  "oilFilter_before",  "oilFilter_after"],
  ["Drain Plug",  "drainPlug_before",  "drainPlug_after"],
])}
${baSection("🚗 Engine Bay &amp; Oil Cap — Before &amp; After", [
  ["Engine Bay Overview", "engineBay_before", "engineBay_after"],
  ["Oil Cap",             "oilCap_before",    "oilCap_after"],
])}
${baSection("💧 Engine Oil Leak — Before &amp; After", [
  ["Oil Leak Area", "oilLeak_before", "oilLeak_after"],
])}

<!-- SIGNATURE BLOCK -->
<div class="section">
  <div class="section-title">✍️ Signatures &amp; Authorization</div>
  <div class="sig-row">
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Technician Signature</div>
      <div style="font-size:11px;color:#334155;margin-top:4px">${info.techName}</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Customer Signature</div>
      <div style="font-size:11px;color:#334155;margin-top:4px">${info.custName}</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Date</div>
      <div style="font-size:11px;color:#334155;margin-top:4px">${date}</div>
    </div>
  </div>
  <div style="margin-top:14px;font-size:9px;color:#94a3b8;line-height:1.6">
    By signing above, the customer acknowledges receipt of this inspection report and authorizes any recommended services. This report documents the vehicle condition at the time of inspection only. All findings are based on visual and physical inspection by the technician named above.
  </div>
</div>

<!-- FOOTER -->
<div class="page-footer">
  <span>🛢️ Vehicle Engine Oil Inspection System</span>
  <span>Report ID: ${Math.random().toString(36).substr(2,9).toUpperCase()} · ${date}</span>
  <span>${info.year} ${info.make} ${info.model} · VIN: ${info.vin}</span>
</div>

</body></html>`);
    win.document.close();
    win.print();
  };

  const handleEmail = () => {
    const subj = `Engine Oil Inspection - ${info.year} ${info.make} ${info.model}`;

    // Build clean plain-text body (no emojis — they break mailto on some clients)
    const divider = "----------------------------------------";
    const checksText = rows.flatMap(r =>
      r.checks.map(c => `  ${c.label}: ${c.selected}`)
    ).join("\n");

    const bodyLines = [
      "ENGINE OIL INSPECTION REPORT",
      divider,
      `Date:       ${date}`,
      `Mileage:    ${parseInt(miles).toLocaleString()} mi`,
      `Technician: ${info.techName}`,
      divider,
      "CUSTOMER",
      `Name:    ${info.custName}`,
      `Phone:   ${info.custPhone}`,
      `Email:   ${info.custEmail}`,
      `Address: ${info.custAddress}`,
      divider,
      "VEHICLE",
      `${info.year} ${info.make} ${info.model}`,
      `VIN: ${info.vin}`,
      divider,
      "OIL LEVEL & CONDITION",
      ...rows.map(r =>
        `Status: ${r.status}\nLevel: ${r.level}\nCondition: ${r.condition}${r.note ? `\nNote: ${r.note}` : ""}`
      ),
      divider,
      "DETAILED INSPECTION CHECKS",
      checksText || "  No checks recorded",
      divider,
      "Generated by Vehicle Engine Oil Inspection System",
    ];

    const body = bodyLines.join("\n");

    // Use window.open for mailto — more reliable than location.href in SPAs
    const mailtoUrl = `mailto:${info.custEmail}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;

    // Try window.open first, fall back to location.href
    const opened = window.open(mailtoUrl, "_blank");
    if (!opened) {
      window.location.href = mailtoUrl;
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000d", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#0f172a", borderRadius:18, width:"100%", maxWidth:640, maxHeight:"90vh", overflowY:"auto", padding:28, position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:14, right:14, background:"#1e293b", border:"1.5px solid #334155", color:"#f1f5f9", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontWeight:700, fontSize:12 }}>✕</button>
        <h2 style={{ color:"#f1f5f9", margin:"0 0 4px", fontSize:20 }}>🛢️ Engine Oil Inspection Report</h2>
        <div style={{ color:"#64748b", fontSize:12, marginBottom:18 }}>{date} · {parseInt(miles).toLocaleString()} mi</div>

        {/* Vehicle summary */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 20px", background:"#1e293b", borderRadius:12, padding:14, marginBottom:18 }}>
          {[["Customer",info.custName],["Phone",info.custPhone],["Email",info.custEmail],["Address",info.custAddress],["Vehicle",`${info.year} ${info.make} ${info.model}`],["VIN",info.vin],["Tech",info.techName]].map(([k,v])=>(
            <div key={k}><div style={{ fontSize:9, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:700 }}>{k}</div><div style={{ fontSize:13, color:"#f1f5f9", fontWeight:600 }}>{v||"—"}</div></div>
          ))}
        </div>

        {/* Oil level summary */}
        {rows.map(r=>(
          <div key={r.fluid} style={{ background:"#1e293b", borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <div style={{ fontWeight:700, color:"#f1f5f9", fontSize:13 }}>{r.icon} {r.fluid}</div>
              <div style={{ fontWeight:700, fontSize:12, color:r.alreadyDone?"#60a5fa":r.status==="Pass"?"#22c55e":r.status==="Monitor"?"#eab308":"#ef4444" }}>{r.status}</div>
            </div>
            <div style={{ fontSize:11, color:"#94a3b8", marginBottom:r.checks.length>0?10:0 }}>Level: {r.level} · {r.condition}{r.note?` · ${r.note}`:""}</div>
            {/* Checks grid */}
            {r.checks.length > 0 && (
              <div style={{ borderTop:"1px solid #334155", paddingTop:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>🔬 Inspection Checks</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {r.checks.map(c=>(
                    <div key={c.label} style={{ background:"#0f172a", borderRadius:7, padding:"7px 9px", borderLeft:`3px solid ${c.color}` }}>
                      <div style={{ fontSize:9, color:"#64748b", fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>{c.icon} {c.label}</div>
                      <div style={{ fontSize:11, color:c.color, fontWeight:700 }}>{c.selected}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button onClick={handlePrint} style={{ width:"100%", background:"#1d4ed8", color:"#fff", border:"none", borderRadius:10, padding:"14px", fontSize:14, fontWeight:700, cursor:"pointer" }}>🖨️ Print Inspection Report</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [info, setInfo] = useState(() => {
    const savedVin   = localStorage.getItem("oil_inspection_vin")   || "";
    const savedMake  = localStorage.getItem("oil_inspection_make")  || "";
    const savedModel = localStorage.getItem("oil_inspection_model") || "";
    const savedYear  = localStorage.getItem("oil_inspection_year")  || "";
    return { custName:"", custPhone:"", custEmail:"", custAddress:"", year:savedYear, make:savedMake, model:savedModel, vin:savedVin, techName:"" };
  });

  // Restore cached VIN result for specs display on reload
  const [vinResult, setVinResult] = useState(() => {
    try {
      const cached = localStorage.getItem("oil_inspection_vehicle");
      if (cached) {
        const d = JSON.parse(cached);
        // Reconstruct a vinResult-compatible object from cache
        return { Make: d.make?.toUpperCase(), Model: d.model?.toUpperCase(), ModelYear: d.year,
          EngineCylinders: d.cylinders, DisplacementL: d.displacement,
          FuelTypePrimary: d.fuelType, DriveType: d.driveType,
          BodyClass: d.bodyClass, PlantCity: d.plantCity, PlantCountry: d.plantCountry,
          _fromCache: true };
      }
    } catch {}
    return null;
  });
  const [miles, setMiles] = useState("");
  const [vehiclePhotos, setVehiclePhotos] = useState({});
  const [wheelPhotos, setWheelPhotos] = useState({});
  const [fluidPhotos, setFluidPhotos] = useState({});

  // ── Before / After photo groups ──
  const [baPhotos, setBaPhotos] = useState({});
  const setBA = (key, val) => setBaPhotos(p => ({ ...p, [key]:val }));
  const [vinLoading, setVinLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [fluidStates, setFluidStates] = useState(
    Object.fromEntries(FLUIDS.map(f => [f.id, {
      toggled:true, alreadyDone:false, level:70, colorIdx:0, status:"", note:"",
      oilChecks: Object.fromEntries(OIL_CHECKS.map(c => [c.id, ""]))
    }]))
  );

  const upInfo = (k, v) => {
    setInfo(p => ({ ...p, [k]:v }));
    // Persist vehicle identity fields to browser memory
    if (k === "vin")   localStorage.setItem("oil_inspection_vin",   v);
    if (k === "make")  localStorage.setItem("oil_inspection_make",  v);
    if (k === "model") localStorage.setItem("oil_inspection_model", v);
    if (k === "year")  localStorage.setItem("oil_inspection_year",  v);
  };
  const upFluid = (id, p) => setFluidStates(s => ({ ...s, [id]:{ ...s[id], ...p } }));

  // ── VIN lookup via NHTSA ──
  const lookupVin = async () => {
    if (!isValidVin(info.vin)) return;
    setVinLoading(true); setVinResult(null);
    try {
      const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${info.vin.trim()}?format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      const v = data.Results?.[0];
      if (v && v.Make && v.Make !== "0" && v.Make !== "") {
        setVinResult(v);
        const make  = v.Make.charAt(0).toUpperCase()  + v.Make.slice(1).toLowerCase();
        const model = v.Model.charAt(0).toUpperCase() + v.Model.slice(1).toLowerCase();
        const year  = v.ModelYear;
        if (year  && year  !== "0") upInfo("year",  year);
        if (v.Make)  upInfo("make",  make);
        if (v.Model) upInfo("model", model);
        // Save full vehicle data to cache
        const cacheData = {
          vin: info.vin.trim(), year, make, model,
          cylinders: v.EngineCylinders, displacement: v.DisplacementL,
          fuelType: v.FuelTypePrimary, driveType: v.DriveType,
          bodyClass: v.BodyClass, plantCity: v.PlantCity, plantCountry: v.PlantCountry,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem("oil_inspection_vin",     info.vin.trim());
        localStorage.setItem("oil_inspection_make",    make);
        localStorage.setItem("oil_inspection_model",   model);
        localStorage.setItem("oil_inspection_year",    year || "");
        localStorage.setItem("oil_inspection_vehicle", JSON.stringify(cacheData));
      } else {
        setVinResult({ error: true, msg: "No vehicle found for this VIN" });
      }
    } catch (e) {
      setVinResult({ error: true, msg: "VIN lookup failed — check your connection or enter manually" });
    }
    setVinLoading(false);
  };

  // ── Completeness ──
  const allVehiclePhotos = ["exterior_front","exterior_rear","exterior_left","exterior_right"].every(k => baPhotos[k+"_before"] && baPhotos[k+"_after"]);
  const allWheelPhotos   = ["wheel_fl","wheel_fr","wheel_rl","wheel_rr"].every(k => baPhotos[k+"_before"] && baPhotos[k+"_after"]);
  const allFluidPhotos = true; // Photo upload removed from oil inspection step
  const infoValid = isValidName(info.custName) && isValidPhone(info.custPhone) &&
    isValidEmail(info.custEmail) && isValidAddress(info.custAddress) &&
    isValidYear(info.year) && isValidMake(info.make) && isValidModel(info.model) &&
    isValidVin(info.vin) && isValidText(info.techName) && isValidMiles(miles);
  const canGenerate = infoValid && allVehiclePhotos && allWheelPhotos && allFluidPhotos;

  const highPri = isValidMiles(miles) ? FLUIDS.filter(f => {
    const r = mileRec(f, miles); return r?.status==="overdue" || r?.status==="soon";
  }) : [];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#020617 0%,#0f172a 50%,#020617 100%)", fontFamily:"'DM Sans','Segoe UI',sans-serif", color:"#f1f5f9", padding:"20px 14px" }}>
      <div style={{ maxWidth:960, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:42, marginBottom:6 }}>🛢️</div>
          <h1 style={{ margin:0, fontSize:"clamp(22px,5vw,32px)", fontWeight:900, letterSpacing:"-0.02em", color:"#f8fafc" }}>Vehicle Engine Oil Inspection</h1>
          <p style={{ color:"#64748b", margin:"6px 0 0", fontSize:13 }}>360° documentation · Full oil analysis · Smell · Viscosity · Contamination · Mile-based recommendations</p>
        </div>

        {/* Progress */}
        <div style={{ background:"#1e293b", borderRadius:12, padding:"12px 16px", marginBottom:18, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          {[
            { l:"Customer Info",    d:infoValid },
            { l:"360° Photos",      d:allVehiclePhotos },
            { l:"Wheel Photos",     d:allWheelPhotos },
            { l:"Oil Inspection",   d:allFluidPhotos },
            { l:"Dipstick & Dash",  d:!!(baPhotos.dipstick_before&&baPhotos.dipstick_after&&baPhotos.dashboard_before&&baPhotos.dashboard_after) },
            { l:"Filter & Plug",    d:!!(baPhotos.oilFilter_before&&baPhotos.oilFilter_after&&baPhotos.drainPlug_before&&baPhotos.drainPlug_after) },
            { l:"Engine Bay",       d:!!(baPhotos.engineBay_before&&baPhotos.engineBay_after&&baPhotos.oilCap_before&&baPhotos.oilCap_after) },
            { l:"Oil Leak",         d:!!(baPhotos.oilLeak_before&&baPhotos.oilLeak_after) },
          ].map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:s.d?"#166534":"#334155", border:`2px solid ${s.d?"#22c55e":"#475569"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:s.d?"#bbf7d0":"#64748b", flexShrink:0, fontWeight:800 }}>{s.d?"✓":i+1}</div>
              <span style={{ fontSize:11, color:s.d?"#bbf7d0":"#64748b", fontWeight:s.d?700:400 }}>{s.l}</span>
              {i < 3 && <span style={{ color:"#334155", margin:"0 2px", fontSize:14 }}>›</span>}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Customer & Vehicle Info ── */}
        <div style={{ background:"#1e293b", borderRadius:18, padding:22, marginBottom:16, border:"1.5px solid #334155" }}>
          <SectionHeader step={1} title="Customer & Vehicle Information" complete={infoValid}/>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))", gap:12, marginBottom:12 }}>
            <FieldBox label="Customer Name"  value={info.custName}  onChange={v=>upInfo("custName",v)}  placeholder="Full name"       validate={isValidName}    hint={v=>/\d/.test(v)?"Names cannot contain numbers":null}/>
            <FieldBox label="Phone"          value={info.custPhone} onChange={v=>upInfo("custPhone",v)} placeholder="(555) 555-5555"  validate={isValidPhone}/>
            <FieldBox label="Email"          value={info.custEmail} onChange={v=>upInfo("custEmail",v)} placeholder="email@example.com" validate={isValidEmail} type="email"/>
            <div style={{ gridColumn:"1/-1" }}>
              <FieldBox label="Address" value={info.custAddress} onChange={v=>upInfo("custAddress",v)} placeholder="123 Main St, City, State ZIP" validate={isValidAddress}/>
            </div>
            <FieldBox label="Year"  value={info.year}  onChange={v=>upInfo("year",v)}  placeholder="2019" validate={isValidYear} hint={v=>v.trim().length>0&&!isValidYear(v)?"Enter a valid year (1980–present)":null}/>
            <FieldBox label="Make"  value={info.make}  onChange={v=>upInfo("make",v)}  placeholder="Toyota, Ford…" validate={isValidMake}  hint={getMakeHint}/>
            <FieldBox label="Model" value={info.model} onChange={v=>upInfo("model",v)} placeholder="Camry, F-150…" validate={isValidModel} hint={v=>/^\d+$/.test(v.trim())?"Model cannot be only numbers":null}/>
            <FieldBox label="Mileage"    value={miles}          onChange={setMiles}              placeholder="95000"    validate={isValidMiles}/>
            <FieldBox label="Technician" value={info.techName}  onChange={v=>upInfo("techName",v)} placeholder="Tech name" validate={isValidText}/>
          </div>

          {/* VIN row */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.09em", color:"#94a3b8", textTransform:"uppercase", marginBottom:4 }}>
              VIN Number <span style={{ color:"#f87171" }}>*</span>
              <span style={{ fontSize:9, color:"#475569", fontWeight:400, marginLeft:8, textTransform:"none", letterSpacing:0 }}>17 characters required</span>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input
                value={info.vin}
                onChange={e => upInfo("vin", e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,""))}
                placeholder="1HGBH41JXMN109186"
                maxLength={17}
                style={{
                  flex:1,
                  background: isValidVin(info.vin) ? "#f0fdf4" : info.vin.length > 0 ? "#fef2f2" : "#1e293b",
                  border: `2px solid ${isValidVin(info.vin) ? "#22c55e" : info.vin.length > 0 ? "#ef4444" : "#334155"}`,
                  borderRadius:8, padding:"9px 11px",
                  color: isValidVin(info.vin) ? "#166534" : info.vin.length > 0 ? "#991b1b" : "#f1f5f9",
                  fontSize:13, outline:"none", fontFamily:"monospace", letterSpacing:"0.12em",
                }}
              />
              <button onClick={lookupVin} disabled={!isValidVin(info.vin) || vinLoading}
                style={{ background: isValidVin(info.vin)?"#1d4ed8":"#1e293b", color: isValidVin(info.vin)?"#fff":"#475569", border:"none", borderRadius:8, padding:"9px 16px", fontSize:12, fontWeight:700, cursor: isValidVin(info.vin)?"pointer":"not-allowed", whiteSpace:"nowrap", transition:"all 0.2s" }}>
                {vinLoading ? "⏳ Looking up…" : "🔍 Decode VIN"}
              </button>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:4 }}>
              <span style={{ fontSize:10, color: isValidVin(info.vin)?"#22c55e":info.vin.length>0?"#f87171":"#475569" }}>
                {info.vin.length}/17 characters
                {isValidVin(info.vin) ? " ✓" : info.vin.length > 0 ? ` — need ${17-info.vin.length} more` : ""}
              </span>
              {isValidVin(info.vin) && (
                <span style={{ fontSize:10, color:"#22c55e", display:"flex", alignItems:"center", gap:4 }}>
                  💾 Saved to browser memory
                  <button onClick={()=>{ localStorage.removeItem("oil_inspection_vin"); localStorage.removeItem("oil_inspection_make"); localStorage.removeItem("oil_inspection_model"); localStorage.removeItem("oil_inspection_year"); upInfo("vin",""); }}
                    style={{ fontSize:9, color:"#f87171", background:"none", border:"none", cursor:"pointer", padding:0, textDecoration:"underline" }}>
                    clear
                  </button>
                </span>
              )}
            </div>
            {vinResult && !vinResult.error && (
              <div style={{ marginTop:6, fontSize:11, color:"#22c55e", background:"#052e16", borderRadius:8, padding:"8px 12px", lineHeight:1.5 }}>
                ✅ <strong>{vinResult.ModelYear} {vinResult.Make} {vinResult.Model}</strong>
                {vinResult.EngineCylinders && vinResult.EngineCylinders !== "0" ? ` · ${vinResult.EngineCylinders}-cyl` : ""}
                {vinResult.DisplacementL && vinResult.DisplacementL !== "0" ? ` ${parseFloat(vinResult.DisplacementL).toFixed(1)}L` : ""}
                {vinResult._fromCache && <span style={{ fontSize:9, color:"#4ade80", marginLeft:8 }}>💾 loaded from cache</span>}
              </div>
            )}
            {vinResult?.error && (
              <div style={{ marginTop:6, fontSize:11, color:"#f87171", background:"#1c0a0a", borderRadius:8, padding:"7px 10px" }}>
                ❌ {vinResult.msg}
              </div>
            )}
            {/* Vehicle Specs Card — engine, oil type, tools */}
            <VehicleSpecsCard vinData={vinResult} make={info.make} model={info.model}/>
          </div>
        </div>

        {/* ── STEP 2: 360° Vehicle — Before & After ── */}
        <div style={{ background:"#1e293b", borderRadius:18, padding:22, marginBottom:16, border:`1.5px solid ${allVehiclePhotos?"#22c55e":"#334155"}` }}>
          <SectionHeader step={2} title="360° Vehicle — Before & After" complete={allVehiclePhotos}/>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 14px", lineHeight:1.5 }}>
            Capture all four sides before and after service — required for liability protection.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:12 }}>
            <BeforeAfterPair label="Front View" icon="⬆️" desc="Straight-on front"
              before={baPhotos.exterior_front_before} after={baPhotos.exterior_front_after}
              onBefore={v=>setBA("exterior_front_before",v)} onAfter={v=>setBA("exterior_front_after",v)}/>
            <BeforeAfterPair label="Rear View" icon="⬇️" desc="Straight-on rear"
              before={baPhotos.exterior_rear_before} after={baPhotos.exterior_rear_after}
              onBefore={v=>setBA("exterior_rear_before",v)} onAfter={v=>setBA("exterior_rear_after",v)}/>
            <BeforeAfterPair label="Driver Side" icon="⬅️" desc="Full left profile"
              before={baPhotos.exterior_left_before} after={baPhotos.exterior_left_after}
              onBefore={v=>setBA("exterior_left_before",v)} onAfter={v=>setBA("exterior_left_after",v)}/>
            <BeforeAfterPair label="Passenger Side" icon="➡️" desc="Full right profile"
              before={baPhotos.exterior_right_before} after={baPhotos.exterior_right_after}
              onBefore={v=>setBA("exterior_right_before",v)} onAfter={v=>setBA("exterior_right_after",v)}/>
          </div>
        </div>

        {/* ── STEP 3: Wheel & Tire — Before & After ── */}
        <div style={{ background:"#1e293b", borderRadius:18, padding:22, marginBottom:16, border:`1.5px solid ${allWheelPhotos?"#22c55e":"#334155"}` }}>
          <SectionHeader step={3} title="Wheel & Tire — Before & After" complete={allWheelPhotos}/>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 14px", lineHeight:1.5 }}>
            Document all four wheels before and after — tire tread, condition, and visible damage.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:12 }}>
            <BeforeAfterPair label="Front Left Wheel" icon="↖️" desc="Tread + sidewall"
              before={baPhotos.wheel_fl_before} after={baPhotos.wheel_fl_after}
              onBefore={v=>setBA("wheel_fl_before",v)} onAfter={v=>setBA("wheel_fl_after",v)}/>
            <BeforeAfterPair label="Front Right Wheel" icon="↗️" desc="Tread + sidewall"
              before={baPhotos.wheel_fr_before} after={baPhotos.wheel_fr_after}
              onBefore={v=>setBA("wheel_fr_before",v)} onAfter={v=>setBA("wheel_fr_after",v)}/>
            <BeforeAfterPair label="Rear Left Wheel" icon="↙️" desc="Tread + sidewall"
              before={baPhotos.wheel_rl_before} after={baPhotos.wheel_rl_after}
              onBefore={v=>setBA("wheel_rl_before",v)} onAfter={v=>setBA("wheel_rl_after",v)}/>
            <BeforeAfterPair label="Rear Right Wheel" icon="↘️" desc="Tread + sidewall"
              before={baPhotos.wheel_rr_before} after={baPhotos.wheel_rr_after}
              onBefore={v=>setBA("wheel_rr_before",v)} onAfter={v=>setBA("wheel_rr_after",v)}/>
          </div>
        </div>

        {/* ── Mile alert ── */}
        {highPri.length > 0 && isValidMiles(miles) && (
          <div style={{ background:"linear-gradient(135deg,#7c1a1a,#431407)", border:"1.5px solid #ef4444", borderRadius:14, padding:"12px 18px", marginBottom:16 }}>
            <div style={{ fontWeight:800, color:"#fca5a5", fontSize:13, marginBottom:6 }}>🚨 Mile-Based Alerts — {parseInt(miles).toLocaleString()} mi</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {highPri.map(f => {
                const r = mileRec(f, miles);
                return <span key={f.id} style={{ background:r.status==="overdue"?"#7f1d1d":"#713f12", color:r.status==="overdue"?"#fecaca":"#fef08a", padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700 }}>{f.icon} {f.label}</span>;
              })}
            </div>
          </div>
        )}

        {/* ── STEP 4: Fluid Inspection ── */}
        <div style={{ background:"#1e293b", borderRadius:18, padding:22, marginBottom:16, border:`1.5px solid ${allFluidPhotos?"#22c55e":"#334155"}` }}>
          <SectionHeader step={4} title="Engine Oil Inspection" complete={allFluidPhotos}/>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 14px", lineHeight:1.5 }}>Complete all inspection checks below.</p>

          {/* Fluid cards */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:16, alignItems:"start" }}>
            {FLUIDS.map(f => (
              <FluidCard key={f.id} fluid={f} miles={miles}
                state={fluidStates[f.id]} onUpdate={p=>upFluid(f.id,p)}
                photoUploaded={!!fluidPhotos[f.id]}/>
            ))}
          </div>
        </div>

        {/* ── STEP 5: Dipstick & Dashboard — Before & After ── */}
        <div style={{ background:"#1e293b", borderRadius:18, padding:22, marginBottom:16, border:"1.5px solid #334155" }}>
          <SectionHeader step={5} title="Dipstick & Dashboard — Before & After" complete={!!(baPhotos.dipstick_before&&baPhotos.dipstick_after&&baPhotos.dashboard_before&&baPhotos.dashboard_after)}/>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 14px", lineHeight:1.5 }}>
            Capture the dipstick and dashboard/cluster before and after the oil change.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:12 }}>
            <BeforeAfterPair label="Oil Dipstick" icon="🛢️" desc="Close-up of dipstick tip showing oil level & color"
              before={baPhotos.dipstick_before} after={baPhotos.dipstick_after}
              onBefore={v=>setBA("dipstick_before",v)} onAfter={v=>setBA("dipstick_after",v)}/>
            <BeforeAfterPair label="Dashboard / Cluster" icon="🖥️" desc="Oil life indicator, mileage, warning lights"
              before={baPhotos.dashboard_before} after={baPhotos.dashboard_after}
              onBefore={v=>setBA("dashboard_before",v)} onAfter={v=>setBA("dashboard_after",v)}/>
          </div>
        </div>

        {/* ── STEP 6: Oil Filter & Drain Plug — Before & After ── */}
        <div style={{ background:"#1e293b", borderRadius:18, padding:22, marginBottom:16, border:"1.5px solid #334155" }}>
          <SectionHeader step={6} title="Oil Filter & Drain Plug — Before & After" complete={!!(baPhotos.oilFilter_before&&baPhotos.oilFilter_after&&baPhotos.drainPlug_before&&baPhotos.drainPlug_after)}/>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 14px", lineHeight:1.5 }}>
            Document the old and new oil filter and drain plug condition.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:12 }}>
            <BeforeAfterPair label="Oil Filter" icon="🔩" desc="Old filter vs new filter installed"
              before={baPhotos.oilFilter_before} after={baPhotos.oilFilter_after}
              onBefore={v=>setBA("oilFilter_before",v)} onAfter={v=>setBA("oilFilter_after",v)}/>
            <BeforeAfterPair label="Drain Plug" icon="🔧" desc="Drain plug area before drain & after reinstall"
              before={baPhotos.drainPlug_before} after={baPhotos.drainPlug_after}
              onBefore={v=>setBA("drainPlug_before",v)} onAfter={v=>setBA("drainPlug_after",v)}/>
          </div>
        </div>


        {/* ── STEP 7: Engine Bay & Oil Service Proof ── */}
        <div style={{ background:"#1e293b", borderRadius:18, padding:22, marginBottom:16, border:`1.5px solid ${
          baPhotos.engineBay_before&&baPhotos.engineBay_after&&baPhotos.oilCap_before&&baPhotos.oilCap_after
          ?"#22c55e":"#334155"}` }}>
          <SectionHeader step={7} title="Engine Bay & Oil Cap — Before & After"
            complete={!!(baPhotos.engineBay_before&&baPhotos.engineBay_after&&baPhotos.oilCap_before&&baPhotos.oilCap_after)}/>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 14px", lineHeight:1.5 }}>
            Document the engine bay and oil cap condition before and after service.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:12 }}>
            <BeforeAfterPair
              label="Engine Bay Overview" icon="🚗"
              desc="Overall engine bay — belts, hoses, leaks, general condition"
              before={baPhotos.engineBay_before} after={baPhotos.engineBay_after}
              onBefore={v=>setBA("engineBay_before",v)} onAfter={v=>setBA("engineBay_after",v)}/>
            <BeforeAfterPair
              label="Oil Cap" icon="🔵"
              desc="Cap condition and debris around fill hole before & after"
              before={baPhotos.oilCap_before} after={baPhotos.oilCap_after}
              onBefore={v=>setBA("oilCap_before",v)} onAfter={v=>setBA("oilCap_after",v)}/>
          </div>
        </div>

        {/* ── STEP 9: Engine Oil Leak — Before & After ── */}
        <div style={{ background:"#1e293b", borderRadius:18, padding:22, marginBottom:16, border:`1.5px solid ${
          baPhotos.oilLeak_before&&baPhotos.oilLeak_after?"#22c55e":"#334155"}` }}>
          <SectionHeader step={8} title="Engine Oil Leak — Before & After"
            complete={!!(baPhotos.oilLeak_before&&baPhotos.oilLeak_after)}/>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 14px", lineHeight:1.5 }}>
            Document any oil leak areas — gaskets, seals, drain plug, oil pan, or undercarriage. Capture before service and after to confirm resolved or note ongoing leaks.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:12 }}>
            <BeforeAfterPair
              label="Oil Leak Area" icon="💧"
              desc="Leak location — undercarriage, gasket, seal, oil pan, drain plug"
              before={baPhotos.oilLeak_before} after={baPhotos.oilLeak_after}
              onBefore={v=>setBA("oilLeak_before",v)} onAfter={v=>setBA("oilLeak_after",v)}/>
          </div>
        </div>

        {/* ── Report Button ── */}
        {canGenerate ? (
          <button onClick={() => setShowReport(true)} style={{ width:"100%", background:"linear-gradient(135deg,#1d4ed8,#7c3aed)", color:"#fff", border:"none", borderRadius:14, padding:"16px 32px", fontSize:15, fontWeight:800, cursor:"pointer", letterSpacing:"0.02em", boxShadow:"0 8px 32px #1d4ed855" }}>
            📋 Generate Inspection Report — Print &amp; Email
          </button>
        ) : (
          <div style={{ background:"#1e293b", border:"2px dashed #334155", borderRadius:14, padding:"16px 20px", textAlign:"center", fontSize:13, color:"#475569", fontWeight:700 }}>
            🔒 Complete all 8 steps to unlock the report
            <div style={{ fontSize:11, color:"#374151", marginTop:5, fontWeight:400, lineHeight:1.7 }}>
              {!infoValid        && "• Fill in all customer & vehicle fields — check for spelling errors in Make/Model   "}
              {!allVehiclePhotos && "• Upload all 4 vehicle angle photos   "}
              {!allWheelPhotos   && "• Upload all 4 wheel photos   "}
              {!allFluidPhotos   && "• Upload a fluid photo for each inspected fluid"}
            </div>
          </div>
        )}

        <div style={{ height:40 }}/>
      </div>

      {showReport && <PrintModal info={{...info, _vehiclePhotos:vehiclePhotos, _wheelPhotos:wheelPhotos, _fluidPhotos:fluidPhotos, _baPhotos:baPhotos}} miles={miles} fluidStates={fluidStates} onClose={()=>setShowReport(false)}/>}
    </div>
  );
}
