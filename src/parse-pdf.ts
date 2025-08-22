import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import path from "path";
import { supabase } from "../supabase/supabaseClient.ts";

const KNOWN_COUNTIES = [
    "Atlantic County",
    "Bergen County",
    "Burlington County",
    "Camden County",
    "Cape May County",
    "Cumberland County",
    "Essex County",
    "Gloucester County",
    "Hudson County",
    "Hunterdon County",
    "Mercer County",
    "Middlesex County",
    "Monmouth County",
    "Morris County",
    "Ocean County",
    "Passaic County",
    "Salem County",
    "Somerset County",
    "Sussex County",
    "Union County",
    "Warren County"
];

type MunicipalityCode = {
  county_code: string;
  municip_code: string;
  county_name: string;
  municipality_name: string;
};

function normalizeCounty(countyName: string): string {
    return countyName.replace(/County$/i, "").trim().toLowerCase();
}

function normalizeTown(muniName: string): string {
    let base = muniName.replace(/\s+(CITY|BORO|TWP|TOWN|VILLAGE)$/i, "").trim();
    return base
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function main() {
    console.log("starting...");
    const pdfPath = path.resolve("docs/cntycode.pdf");
    console.log("Reading PDF from:", pdfPath);

    if(!fs.existsSync(pdfPath)) {
        console.error(`PDF file not found at: ${pdfPath}`);
        process.exit(1);
    }

  const pdfBuffer = fs.readFileSync(pdfPath);

  const data = await pdf(pdfBuffer);
  const lines = data.text.split("\n").map(l => l.trim()).filter(Boolean);

  const entries: any[] = [];
  let lastCountyName = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const match = line.match(/^(\d{2})(\d{2})(.*)$/);
    if (match) {
        const countyCode = match[1];
        const muniCode = match[2];
        let rest = match[3].trim();

        let county = "";
        let muni = rest;

        for (const knownCounty of KNOWN_COUNTIES) {
            if (rest.endsWith(knownCounty)) {
                county = knownCounty;
                muni = rest.slice(0, rest.length - knownCounty.length).trim();
                lastCountyName = county;
                break;
            }
        }

        if (!county) {
            county = lastCountyName;
        }

        entries.push({
            county_name: normalizeCounty(county),
            municipality_name: normalizeTown(muni),
            county_code: countyCode,
            municip_code: muniCode
        });
    } else {
        for (const knownCounty of KNOWN_COUNTIES) {
            if (line === knownCounty) {
                lastCountyName = knownCounty;
                break;
            }
        }
    }
  }

  console.log(`Parsed ${entries.length} entries`);

  // Push to Supabase
  const { data: inserted, error } = await supabase
    .from("nj_municipality_codes")
    .insert(entries)
    .select();

  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Inserted successfully:", inserted?.length);
  }
}

main().catch((err) => {
    console.error("Unexpected error:", err);
});
